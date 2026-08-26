import type { Affiliate, AffiliateStats, Program, ProgramStats } from "../types";
import { conversionRate } from "../lib/utils";

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<{ id: string; email: string; password_hash: string; created_at: number } | null> {
  return db
    .prepare("SELECT id, email, password_hash, created_at FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();
}

export async function getUserById(db: D1Database, id: string) {
  return db
    .prepare("SELECT id, email, created_at FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string; email: string; created_at: number }>();
}

export async function createUser(
  db: D1Database,
  user: { id: string; email: string; password_hash: string; created_at: number },
) {
  await db
    .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .bind(user.id, user.email.toLowerCase(), user.password_hash, user.created_at)
    .run();
}

export async function listPrograms(db: D1Database, userId: string): Promise<Program[]> {
  const { results } = await db
    .prepare(
      "SELECT id, user_id, name, slug, api_key, destination_url, created_at FROM programs WHERE user_id = ? ORDER BY created_at DESC",
    )
    .bind(userId)
    .all<Program>();
  return results ?? [];
}

export async function getProgram(db: D1Database, programId: string, userId: string) {
  return db
    .prepare(
      "SELECT id, user_id, name, slug, api_key, destination_url, created_at FROM programs WHERE id = ? AND user_id = ?",
    )
    .bind(programId, userId)
    .first<Program>();
}

export async function getProgramById(db: D1Database, programId: string) {
  return db
    .prepare(
      "SELECT id, user_id, name, slug, api_key, destination_url, created_at FROM programs WHERE id = ?",
    )
    .bind(programId)
    .first<Program>();
}

export async function getProgramByApiKey(db: D1Database, apiKey: string) {
  return db
    .prepare(
      "SELECT id, user_id, name, slug, api_key, destination_url, created_at FROM programs WHERE api_key = ?",
    )
    .bind(apiKey)
    .first<Program>();
}

export async function createProgram(db: D1Database, program: Program) {
  await db
    .prepare(
      "INSERT INTO programs (id, user_id, name, slug, api_key, destination_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      program.id,
      program.user_id,
      program.name,
      program.slug,
      program.api_key,
      program.destination_url,
      program.created_at,
    )
    .run();
}

export async function updateProgram(
  db: D1Database,
  programId: string,
  userId: string,
  updates: { name?: string; destination_url?: string | null },
): Promise<Program | null> {
  const existing = await getProgram(db, programId, userId);
  if (!existing) return null;

  const next = {
    name: updates.name?.trim() || existing.name,
    destination_url:
      updates.destination_url === undefined
        ? existing.destination_url
        : updates.destination_url,
  };

  await db
    .prepare("UPDATE programs SET name = ?, destination_url = ? WHERE id = ? AND user_id = ?")
    .bind(next.name, next.destination_url, programId, userId)
    .run();

  return getProgram(db, programId, userId);
}

export async function listAffiliates(db: D1Database, programId: string): Promise<Affiliate[]> {
  const { results } = await db
    .prepare("SELECT id, program_id, name, code, created_at FROM affiliates WHERE program_id = ? ORDER BY created_at DESC")
    .bind(programId)
    .all<Affiliate>();
  return results ?? [];
}

export async function getAffiliateByCode(db: D1Database, code: string) {
  return db
    .prepare("SELECT id, program_id, name, code, created_at FROM affiliates WHERE code = ?")
    .bind(code)
    .first<Affiliate>();
}

export async function createAffiliate(db: D1Database, affiliate: Affiliate) {
  await db
    .prepare("INSERT INTO affiliates (id, program_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(affiliate.id, affiliate.program_id, affiliate.name, affiliate.code, affiliate.created_at)
    .run();
}

export async function recordClick(db: D1Database, click: { id: string; affiliate_id: string; created_at: number }) {
  await db
    .prepare("INSERT INTO clicks (id, affiliate_id, created_at) VALUES (?, ?, ?)")
    .bind(click.id, click.affiliate_id, click.created_at)
    .run();
}

export async function recordConversion(
  db: D1Database,
  conversion: { id: string; affiliate_id: string; order_id: string; amount_cents: number; created_at: number },
): Promise<"created" | "duplicate"> {
  try {
    await db
      .prepare(
        "INSERT INTO conversions (id, affiliate_id, order_id, amount_cents, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        conversion.id,
        conversion.affiliate_id,
        conversion.order_id,
        conversion.amount_cents,
        conversion.created_at,
      )
      .run();
    return "created";
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return "duplicate";
    }
    throw error;
  }
}

export async function getProgramStats(db: D1Database, program: Program): Promise<ProgramStats> {
  const affiliates = await listAffiliates(db, program.id);
  const stats: AffiliateStats[] = [];

  for (const affiliate of affiliates) {
    const clicks = await db
      .prepare("SELECT COUNT(*) as count FROM clicks WHERE affiliate_id = ?")
      .bind(affiliate.id)
      .first<{ count: number }>();
    const conversions = await db
      .prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(amount_cents), 0) as revenue FROM conversions WHERE affiliate_id = ?",
      )
      .bind(affiliate.id)
      .first<{ count: number; revenue: number }>();

    const clickCount = clicks?.count ?? 0;
    const conversionCount = conversions?.count ?? 0;
    stats.push({
      ...affiliate,
      clicks: clickCount,
      conversions: conversionCount,
      revenue_cents: conversions?.revenue ?? 0,
      conversion_rate: conversionRate(conversionCount, clickCount),
    });
  }

  const totals = stats.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      conversions: acc.conversions + row.conversions,
      revenue_cents: acc.revenue_cents + row.revenue_cents,
    }),
    { clicks: 0, conversions: 0, revenue_cents: 0 },
  );

  return {
    program,
    totals: {
      ...totals,
      conversion_rate: conversionRate(totals.conversions, totals.clicks),
    },
    affiliates: stats,
  };
}
