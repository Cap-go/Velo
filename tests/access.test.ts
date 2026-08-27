import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveOperator } from "../worker/lib/access";
import type { Env } from "../worker/types";
import { initSql } from "./schema";

describe("cloudflare access auth", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
  });

  it("allows localhost without Access configuration", async () => {
    const user = await resolveOperator({
      env: { ...env, APP_URL: "http://localhost:5173" } as Env,
      req: { header: () => undefined },
    });
    expect(user?.email).toBe("operator@localhost");
  });

  it("allows production without Access configuration (instance owner)", async () => {
    const user = await resolveOperator({
      env: { ...env, APP_URL: "https://capve.app" } as Env,
      req: { header: () => undefined },
    });
    expect(user?.email).toBe("operator@instance");
  });

  it("fails closed when Access is configured but JWT is missing", async () => {
    const user = await resolveOperator({
      env: {
        ...env,
        APP_URL: "https://capve.app",
        TEAM_DOMAIN: "https://example.cloudflareaccess.com",
        POLICY_AUD: "test-aud",
      } as Env,
      req: { header: () => undefined },
    });
    expect(user).toBeNull();
  });

  it("program APIs work without Access env vars", async () => {
    const res = await SELF.fetch("http://localhost/api/programs", {
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { programs: unknown[] };
    expect(Array.isArray(body.programs)).toBe(true);
  });
});
