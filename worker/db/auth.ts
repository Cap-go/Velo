import { id, isUniqueConstraintError } from "../lib/utils";

export type AuthTokenKind = "reset" | "verify";

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAuthToken(
  db: D1Database,
  userId: string,
  kind: AuthTokenKind,
  rawToken: string,
  expiresAt: number,
) {
  const tokenId = id("tok");
  const tokenHash = await hashToken(rawToken);
  await db
    .prepare(
      "INSERT INTO auth_tokens (id, user_id, token_hash, kind, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(tokenId, userId, tokenHash, kind, expiresAt, Date.now())
    .run();
}

export async function consumeAuthToken(db: D1Database, rawToken: string, kind: AuthTokenKind) {
  const tokenHash = await hashToken(rawToken);
  const row = await db
    .prepare(
      "SELECT id, user_id, expires_at FROM auth_tokens WHERE token_hash = ? AND kind = ? LIMIT 1",
    )
    .bind(tokenHash, kind)
    .first<{ id: string; user_id: string; expires_at: number }>();

  if (!row || row.expires_at < Date.now()) return null;

  await db.prepare("DELETE FROM auth_tokens WHERE id = ?").bind(row.id).run();
  return row;
}

export async function deleteAuthTokensForUser(db: D1Database, userId: string, kind: AuthTokenKind) {
  await db
    .prepare("DELETE FROM auth_tokens WHERE user_id = ? AND kind = ?")
    .bind(userId, kind)
    .run();
}

export function isEmailTakenError(error: unknown): boolean {
  return isUniqueConstraintError(error);
}
