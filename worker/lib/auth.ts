import { SignJWT, jwtVerify } from "jose";
import type { Env, User } from "../types";

const COOKIE = "velo_session";
const MAX_AGE = 60 * 60 * 24 * 30;

async function secret(env: Env): Promise<Uint8Array> {
  const value = env.JWT_SECRET ?? "velo-dev-secret-change-in-production";
  return new TextEncoder().encode(value);
}

export async function createSession(env: Env, user: User): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await secret(env));
}

export async function readSession(
  env: Env,
  cookieHeader: string | null,
): Promise<{ userId: string; email: string } | null> {
  if (!cookieHeader) return null;
  const token = parseCookie(cookieHeader)[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret(env));
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export const REF_COOKIE = "_velo_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 30;

export function affiliateCookie(code: string, secure: boolean): string {
  const parts = [
    `${REF_COOKIE}=${encodeURIComponent(code)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${REF_MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readAffiliateCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const raw = parseCookie(cookieHeader)[REF_COOKIE];
  return raw ? decodeURIComponent(raw) : null;
}

function parseCookie(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
}

export function isSecureRequest(url: URL): boolean {
  return url.protocol === "https:";
}
