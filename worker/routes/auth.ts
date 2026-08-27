import { Hono } from "hono";
import type { Env } from "../types";
import { accessConfigured, resolveOperator } from "../lib/access";

const auth = new Hono<{ Bindings: Env }>();

auth.get("/me", async (c) => {
  const user = await resolveOperator(c);
  if (!user) {
    return c.json({ user: null, access_required: accessConfigured(c.env) });
  }
  return c.json({ user: { id: user.id, email: user.email }, access_required: false });
});

export { auth };
