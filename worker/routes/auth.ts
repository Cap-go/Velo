import { Hono } from "hono";
import type { Env } from "../types";
import { accessConfigured, resolveOperator } from "../lib/access";

const auth = new Hono<{ Bindings: Env }>();

auth.get("/me", async (c) => {
  const session = await resolveOperator(c);
  if (!session) {
    return c.json({ user: null, access_required: accessConfigured(c.env) });
  }
  return c.json({
    user: {
      id: session.id,
      email: session.email,
      role: session.role,
      account_id: session.account_id,
    },
    access_required: false,
  });
});

export { auth };
