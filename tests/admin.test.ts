import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { cookieFrom, registerTestUser } from "./helpers";
import { initSql } from "./schema";

const ADMIN_EMAIL = "martindonadieu@gmail.com";

async function registerAdmin() {
  const res = await SELF.fetch("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: "test-password-12", name: "Martin" }),
  });
  const session = cookieFrom(res, "capve_session");
  return {
    res,
    authHeaders: session
      ? { "Content-Type": "application/json", Cookie: `capve_session=${encodeURIComponent(session)}` }
      : null,
  };
}

describe("platform admin", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
    await env.DB.exec(`DELETE FROM auth_tokens; DELETE FROM users;`);
  });

  it("grants platform admin to PLATFORM_ADMIN_EMAILS on register", async () => {
    const { res } = await registerAdmin();
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { is_platform_admin: boolean; email: string } };
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.is_platform_admin).toBe(true);
  });

  it("returns platform overview for platform admins", async () => {
    const { authHeaders } = await registerAdmin();
    expect(authHeaders).toBeTruthy();
    const overviewRes = await SELF.fetch("http://localhost/api/admin/overview", {
      headers: authHeaders!,
    });
    expect(overviewRes.status).toBe(200);
    const body = (await overviewRes.json()) as { overview: { users: number } };
    expect(body.overview.users).toBeGreaterThan(0);
  });

  it("blocks non-admin users from admin APIs", async () => {
    const { authHeaders } = await registerTestUser();
    const res = await SELF.fetch("http://localhost/api/admin/overview", { headers: authHeaders });
    expect(res.status).toBe(403);
  });
});
