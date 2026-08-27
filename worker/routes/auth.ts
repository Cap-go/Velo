import { Hono } from "hono";
import type { Env } from "../types";
import {
  createUser,
  getUserByEmail,
  getUserById,
} from "../db/queries";
import {
  clearSessionCookie,
  createSession,
  isSecureRequest,
  readSession,
  sessionCookie,
} from "../lib/auth";
import { authCookieDomain } from "../lib/hosts";
import { hashPassword, verifyPassword } from "../lib/password";
import { id } from "../lib/utils";

const auth = new Hono<{ Bindings: Env }>();

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password || password.length < 8) {
    return c.json({ error: "Email and password (8+ chars) required" }, 400);
  }

  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const user = {
    id: id("usr"),
    email,
    password_hash: await hashPassword(password),
    created_at: Date.now(),
  };
  await createUser(c.env.DB, user);

  const token = await createSession(c.env, { id: user.id, email: user.email, created_at: user.created_at });
  const secure = isSecureRequest(new URL(c.req.url));
  const domain = authCookieDomain(c.env.CONSOLE_URL);
  c.header("Set-Cookie", sessionCookie(token, secure, domain));
  return c.json({ user: { id: user.id, email: user.email } }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const user = await getUserByEmail(c.env.DB, email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await createSession(c.env, {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
  const secure = isSecureRequest(new URL(c.req.url));
  const domain = authCookieDomain(c.env.CONSOLE_URL);
  c.header("Set-Cookie", sessionCookie(token, secure, domain));
  return c.json({ user: { id: user.id, email: user.email } });
});

auth.post("/logout", async (c) => {
  const secure = isSecureRequest(new URL(c.req.url));
  const domain = authCookieDomain(c.env.CONSOLE_URL);
  c.header("Set-Cookie", clearSessionCookie(secure, domain));
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const session = await readSession(c.env, c.req.header("Cookie") ?? null);
  if (!session) return c.json({ user: null });
  const user = await getUserById(c.env.DB, session.userId);
  if (!user) return c.json({ user: null });
  return c.json({ user: { id: user.id, email: user.email } });
});

export { auth };

export async function requireUser(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
}) {
  const session = await readSession(c.env, c.req.header("Cookie") ?? null);
  if (!session) return null;
  return getUserById(c.env.DB, session.userId);
}
