import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { initSql } from "./schema";

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
    const signup = await SELF.fetch("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "founder@example.com",
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
      body: JSON.stringify({ name: "Test SaaS" }),
    });
    expect(programRes.status).toBe(201);
    const { program } = await json<{ program: { id: string; api_key: string } }>(programRes);

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

    const clickRes = await SELF.fetch(tracking_url, { redirect: "manual" });
    expect(clickRes.status).toBe(302);
    const refCookie = cookieFrom(clickRes, "_velo_ref");
    expect(refCookie).toBe(affiliate.code);

    const convertRes = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Program-Key": program.api_key,
        Cookie: `_velo_ref=${refCookie}`,
      },
      body: JSON.stringify({ order_id: "order_001", amount: 99.5 }),
    });
    expect(convertRes.status).toBe(200);
    const conversion = await json<{ status: string }>(convertRes);
    expect(conversion.status).toBe("created");

    const duplicateRes = await SELF.fetch("http://localhost/api/v1/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Program-Key": program.api_key,
        Cookie: `_velo_ref=${refCookie}`,
      },
      body: JSON.stringify({ order_id: "order_001", amount: 99.5 }),
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
});
