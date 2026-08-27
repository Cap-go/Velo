import { Hono } from "hono";
import type { Env } from "../types";
import { resolveOperator } from "../lib/access";

const auth = new Hono<{ Bindings: Env }>();

auth.get("/me", async (c) => {
  const user = await resolveOperator(c);
  if (!user) return c.json({ user: null });
  return c.json({ user: { id: user.id, email: user.email } });
});

export { auth };
