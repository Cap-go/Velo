import { env } from "cloudflare:test";
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

  it("fails closed in production without Access configuration", async () => {
    const user = await resolveOperator({
      env: { ...env, APP_URL: "https://capve.app" } as Env,
      req: { header: () => undefined },
    });
    expect(user).toBeNull();
  });
});
