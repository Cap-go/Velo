import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { initSql } from "./schema";

const MERCHANT_DESTINATION = "https://merchant.example.com/pricing";

async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function cookieFrom(response: Response, name: string): string | undefined {
  const headers = response.headers.getSetCookie?.() ?? [];
  const legacy = response.headers.get("set-cookie");
  const all = headers.length > 0 ? headers : legacy ? [legacy] : [];
  for (const line of all) {
    const [pair] = line.split(";");
    const [key, value] = pair.split("=");
    if (key.trim() === name) return value;
  }
  return undefined;
}

async function signupAndCreateProgram(email: string) {
  const signup = await SELF.fetch("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
    }),
  });
  expect(signup.status).toBe(201);
  const session = cookieFrom(signup, "velo_session");
  expect(session).toBeTruthy();

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `velo_session=${session}`,
  };

  const programRes = await SELF.fetch("http://localhost/api/programs", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Test SaaS",
      destination_url: MERCHANT_DESTINATION,
    }),
  });
  expect(programRes.status).toBe(201);
  const { program, convert_secret } = await json<{
    program: { id: string; destination_url: string };
    convert_secret: string;
  }>(programRes);
  expect(convert_secret).toMatch(/^sk_/);

  return { session: session!, authHeaders, program, convert_secret };
}

function convertHeaders(secret: string) {
  return {
    "Content-Type": "application/json",
    "X-Program-Secret": secret,
  };
}

describe("affiliate tracking flow", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
    await env.DB.exec(`
      DELETE FROM conversions;
      DELETE FROM clicks;
      DELETE FROM affiliates;
      DELETE FROM programs;
      DELETE FROM users;
    `);
  });

  it("signup → program → affiliate → click → convert → stats", async () => {
    const { session, authHeaders, program, convert_secret } =
      await signupAndCreateProgram("founder@example.com");

    const affiliateRes = await SELF.fetch(
      `http://localhost/api/programs/${program.id}/affiliates`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Partner One" }),
      },
    );
    expect(affiliateRes.status).toBe(201);
    const { affiliate, tracking_url } = await json<{
      affiliate: { code: string };
      tracking_url: string;
    }>(affiliateRes);
    expect(tracking_url).toBe(`http://localhost:5173/r/${affiliate.code}`);
    expect(tracking_url).not.toContain("example.com");

    const clickRes = await SELF.fetch(tracking_url, { redirect: "manual" });
    expect(clickRes.status).toBe(302);
    const refCookie = cookieFrom(clickRes, "_velo_ref");
    expect(refCookie).toBe(affiliate.code);

    const location = clickRes.headers.get("Location");
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location!);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(MERCHANT_DESTINATION);
    expect(redirectUrl.searchParams.get("velo_ref")).toBe(affiliate.code);

    const convertRes = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: convertHeaders(convert_secret),
      body: JSON.stringify({
        order_id: "order_001",
        amount: 99.5,
        affiliate_code: affiliate.code,
      }),
    });
    expect(convertRes.status).toBe(200);
    const conversion = await json<{ status: string }>(convertRes);
    expect(conversion.status).toBe("created");
    expect(convertRes.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const duplicateRes = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: convertHeaders(convert_secret),
      body: JSON.stringify({
        order_id: "order_001",
        amount: 99.5,
        affiliate_code: affiliate.code,
      }),
    });
    const duplicate = await json<{ status: string }>(duplicateRes);
    expect(duplicate.status).toBe("duplicate");

    const statsRes = await SELF.fetch(
      `http://localhost/api/programs/${program.id}/stats`,
      { headers: { Cookie: `velo_session=${session}` } },
    );
    expect(statsRes.status).toBe(200);
    const stats = await json<{
      totals: {
        clicks: number;
        conversions: number;
        revenue_cents: number;
        conversion_rate: number;
      };
      affiliates: Array<{ code: string; clicks: number; conversions: number }>;
    }>(statsRes);

    expect(stats.totals.clicks).toBe(1);
    expect(stats.totals.conversions).toBe(1);
    expect(stats.totals.revenue_cents).toBe(9950);
    expect(stats.totals.conversion_rate).toBe(100);
    expect(stats.affiliates[0]?.code).toBe(affiliate.code);
    expect(stats.affiliates[0]?.clicks).toBe(1);
    expect(stats.affiliates[0]?.conversions).toBe(1);
  });

  it("dedupes conversions by program and order id across affiliates", async () => {
    const { authHeaders, program, convert_secret } =
      await signupAndCreateProgram("dedupe@example.com");

    const firstAffiliate = await json<{ affiliate: { code: string } }>(
      await SELF.fetch(`http://localhost/api/programs/${program.id}/affiliates`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Affiliate A" }),
      }),
    );
    const secondAffiliate = await json<{ affiliate: { code: string } }>(
      await SELF.fetch(`http://localhost/api/programs/${program.id}/affiliates`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Affiliate B" }),
      }),
    );

    const firstConvert = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: convertHeaders(convert_secret),
      body: JSON.stringify({
        order_id: "order_shared",
        amount: 40,
        affiliate_code: firstAffiliate.affiliate.code,
      }),
    });
    expect(firstConvert.status).toBe(200);
    expect((await json<{ status: string }>(firstConvert)).status).toBe("created");

    const secondConvert = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: convertHeaders(convert_secret),
      body: JSON.stringify({
        order_id: "order_shared",
        amount: 40,
        affiliate_code: secondAffiliate.affiliate.code,
      }),
    });
    expect(secondConvert.status).toBe(200);
    expect((await json<{ status: string }>(secondConvert)).status).toBe("duplicate");
  });

  it("rejects off-host redirect overrides", async () => {
    const { authHeaders, program } = await signupAndCreateProgram("security@example.com");

    const affiliateRes = await SELF.fetch(
      `http://localhost/api/programs/${program.id}/affiliates`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Partner Two" }),
      },
    );
    const { affiliate } = await json<{ affiliate: { code: string } }>(affiliateRes);

    const phishing = await SELF.fetch(
      `http://localhost/r/${affiliate.code}?url=${encodeURIComponent("https://evil.example/phish")}`,
      { redirect: "manual" },
    );
    expect(phishing.status).toBe(400);
    expect(await phishing.text()).toContain("not allowed");

    const javascript = await SELF.fetch(
      `http://localhost/r/${affiliate.code}?url=${encodeURIComponent("javascript:alert(1)")}`,
      { redirect: "manual" },
    );
    expect(javascript.status).toBe(400);
  });

  it("allows same-host deep links in url override", async () => {
    const { authHeaders, program } = await signupAndCreateProgram("deeplink@example.com");

    const affiliateRes = await SELF.fetch(
      `http://localhost/api/programs/${program.id}/affiliates`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Partner Deep Link" }),
      },
    );
    const { affiliate } = await json<{ affiliate: { code: string } }>(affiliateRes);

    const deepLink = "https://merchant.example.com/checkout?plan=pro";
    const clickRes = await SELF.fetch(
      `http://localhost/r/${affiliate.code}?url=${encodeURIComponent(deepLink)}`,
      { redirect: "manual" },
    );
    expect(clickRes.status).toBe(302);
    const location = new URL(clickRes.headers.get("Location")!);
    expect(location.hostname).toBe("merchant.example.com");
    expect(location.pathname).toBe("/checkout");
    expect(location.searchParams.get("plan")).toBe("pro");
    expect(location.searchParams.get("velo_ref")).toBe(affiliate.code);
  });

  it("supports CORS preflight on convert", async () => {
    const preflight = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "OPTIONS",
      headers: {
        Origin: "https://merchant.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-program-secret",
      },
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
