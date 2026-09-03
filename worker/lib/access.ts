import type { Context } from "hono";
import type { Env, User } from "../types";
import type { SessionUser, TeamRole } from "../types-ops";
import { findTeamMembership } from "../db/ops";
import { getUserById } from "../db/queries";
import { readSessionCookie, verifySession } from "./session";

async function resolveSession(db: D1Database, user: User): Promise<SessionUser> {
  const is_platform_admin = user.is_platform_admin === 1;
  const membership = await findTeamMembership(db, user.email);
  if (membership) {
    return {
      id: user.id,
      email: user.email,
      role: membership.role,
      account_id: membership.owner_user_id,
      is_platform_admin,
    };
  }
  return {
    id: user.id,
    email: user.email,
    role: "owner",
    account_id: user.id,
    is_platform_admin,
  };
}

export async function resolveOperator(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
}): Promise<SessionUser | null> {
  const token = readSessionCookie(c.req.header("cookie") ?? null);
  if (!token) return null;

  const claims = await verifySession(c.env, token);
  if (!claims) return null;

  const user = await getUserById(c.env.DB, claims.sub);
  if (!user || user.email !== claims.email) return null;

  return resolveSession(c.env.DB, user);
}

export async function requireUser(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
}): Promise<SessionUser | null> {
  return resolveOperator(c);
}

export function canWrite(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export async function requireWrite(c: Context<{ Bindings: Env }>): Promise<SessionUser | Response> {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (!canWrite(session.role)) return c.json({ error: "Forbidden" }, 403);
  return session;
}

export async function requirePlatformAdmin(
  c: Context<{ Bindings: Env }>,
): Promise<SessionUser | Response> {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (!session.is_platform_admin) return c.json({ error: "Forbidden" }, 403);
  return session;
}

export async function sessionForUser(db: D1Database, userId: string): Promise<SessionUser | null> {
  const user = await getUserById(db, userId);
  if (!user) return null;
  return resolveSession(db, user);
}
