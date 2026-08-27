import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env, User } from "../types";
import { createUser, getUserByEmail } from "../db/queries";
import { id } from "./utils";

const DEV_OPERATOR_EMAIL = "operator@localhost";
const INSTANCE_OPERATOR_EMAIL = "operator@instance";

function isLocalDev(env: Env): boolean {
  try {
    const host = new URL(env.APP_URL).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function accessConfigured(env: Env): boolean {
  return Boolean(env.TEAM_DOMAIN && env.POLICY_AUD);
}

function instanceOperatorEmail(env: Env): string {
  return isLocalDev(env) ? DEV_OPERATOR_EMAIL : INSTANCE_OPERATOR_EMAIL;
}

const jwksByTeam = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksByTeam.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksByTeam.set(teamDomain, jwks);
  }
  return jwks;
}

export async function verifyAccessToken(
  env: Env,
  token: string,
): Promise<{ email: string } | null> {
  const teamDomain = env.TEAM_DOMAIN;
  if (!teamDomain || !env.POLICY_AUD) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain,
      audience: env.POLICY_AUD,
    });
    const email = payload.email;
    if (typeof email !== "string" || !email) return null;
    return { email: email.toLowerCase() };
  } catch {
    return null;
  }
}

async function getOrCreateUser(db: D1Database, email: string): Promise<User> {
  const existing = await getUserByEmail(db, email);
  if (existing) {
    return { id: existing.id, email: existing.email, created_at: existing.created_at };
  }

  const user: User = { id: id("usr"), email, created_at: Date.now() };
  await createUser(db, user);
  return user;
}

export async function resolveOperator(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
}): Promise<User | null> {
  const { env, req } = c;

  if (!accessConfigured(env)) {
    return getOrCreateUser(env.DB, instanceOperatorEmail(env));
  }

  const token = req.header("cf-access-jwt-assertion");
  if (!token) return null;

  const identity = await verifyAccessToken(env, token);
  if (!identity) return null;

  return getOrCreateUser(env.DB, identity.email);
}

export async function requireUser(c: {
  env: Env;
  req: { header: (name: string) => string | undefined };
}): Promise<User | null> {
  return resolveOperator(c);
}
