import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { cookieFrom, registerTestUser } from "./helpers";
import { resolveOperator } from "../worker/lib/access";
import type { Env } from "../worker/types";
import { initSql } from "./schema";

describe("session auth", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
  });

  it("returns null without a session cookie", async () => {
    const user = await resolveOperator({
      env: { ...env, APP_URL: "http://localhost:5173" } as Env,
      req: { header: () => undefined },
    });
    expect(user).toBeNull();
  });

  it("registers, sets session cookie, and resolves user", async () => {
    const { email, authHeaders } = await registerTestUser();

    const meRes = await SELF.fetch("http://localhost/api/auth/me", { headers: authHeaders });
    expect(meRes.status).toBe(200);
    const body = (await meRes.json()) as { user: { email: string } | null };
    expect(body.user?.email).toBe(email);
  });

  it("logs in with email and password", async () => {
    const email = `login-${crypto.randomUUID()}@example.com`;
    const password = "test-password-12";
    const registerRes = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(registerRes.status).toBe(201);

    const loginRes = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    expect(loginRes.status).toBe(401);

    const okRes = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(okRes.status).toBe(200);
    expect(cookieFrom(okRes, "capve_session")).toBeTruthy();
  });

  it("program APIs require authentication", async () => {
    const res = await SELF.fetch("http://localhost/api/programs", {
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("authenticated users can list programs", async () => {
    const { authHeaders } = await registerTestUser();
    const res = await SELF.fetch("http://localhost/api/programs", { headers: authHeaders });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { programs: unknown[] };
    expect(Array.isArray(body.programs)).toBe(true);
  });
});
