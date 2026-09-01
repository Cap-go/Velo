import type {
  Affiliate,
  AffiliateStats,
  Click,
  ClickLogRow,
  ConversionLogRow,
  Program,
  ProgramStats,
} from "../types";
import { campaignKeyFromName } from "./entities";
import { affiliateCode, conversionRate, id, isUniqueConstraintError } from "../lib/utils";

const PROGRAM_COLUMNS =
  "id, user_id, name, slug, api_key, destination_url, s2s_postback_url, campaign_key, group_id, traffic_source_id, tags, status, created_at";

const USER_COLUMNS = "id, email, name, email_verified, created_at";

export async function getUserByEmail(db: D1Database, email: string) {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`)
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; name: string | null; email_verified: number; created_at: number }>();
}

export async function getUserById(db: D1Database, userId: string) {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ id: string; email: string; name: string | null; email_verified: number; created_at: number }>();
}

export async function getUserPasswordHash(db: D1Database, email: string) {
  return db
    .prepare("SELECT password_hash FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ password_hash: string | null }>();
}

export async function createUser(
  db: D1Database,
  user: {
    id: string;
    email: string;
    password_hash: string;
    name?: string | null;
    created_at: number;
  },
) {
  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, name, email_verified, created_at) VALUES (?, ?, ?, ?, 1, ?)",
    )
    .bind(user.id, user.email.toLowerCase(), user.password_hash, user.name ?? null, user.created_at)
    .run();
}

export async function updateUserPassword(db: D1Database, userId: string, passwordHash: string) {
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(passwordHash, userId)
    .run();
}

export async function listPrograms(db: D1Database, userId: string): Promise<Program[]> {
  const { results } = await db
    .prepare(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(userId)
    .all<Program>();
  return results ?? [];
}

export async function getProgram(db: D1Database, programId: string, userId: string) {
  return db
    .prepare(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = ? AND user_id = ?`)
    .bind(programId, userId)
    .first<Program>();
}

export async function getProgramById(db: D1Database, programId: string) {
  return db
    .prepare(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = ?`)
    .bind(programId)
    .first<Program>();
}

export async function getProgramByConvertSecret(db: D1Database, secret: string) {
  return db
    .prepare(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE convert_secret = ?`)
    .bind(secret)
    .first<Program>();
}

export async function createProgram(
  db: D1Database,
  program: Program & { convert_secret: string },
) {
  await db
    .prepare(
      `INSERT INTO programs (
        id, user_id, name, slug, api_key, destination_url, convert_secret,
        s2s_postback_url, campaign_key, group_id, traffic_source_id, tags, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      program.id,
      program.user_id,
      program.name,
      program.slug,
      program.api_key,
      program.destination_url,
      program.convert_secret,
      program.s2s_postback_url ?? null,
      program.campaign_key ?? null,
      program.group_id ?? null,
      program.traffic_source_id ?? null,
      program.tags ?? null,
      program.status ?? "active",
      program.created_at,
    )
    .run();
}

export async function updateProgram(
  db: D1Database,
  programId: string,
  userId: string,
  updates: {
    name?: string;
    destination_url?: string | null;
    s2s_postback_url?: string | null;
    group_id?: string | null;
    traffic_source_id?: string | null;
    tags?: string | null;
    status?: string;
  },
): Promise<Program | null> {
  const existing = await getProgram(db, programId, userId);
  if (!existing) return null;

  const next = {
    name: updates.name?.trim() || existing.name,
    destination_url:
      updates.destination_url === undefined
        ? existing.destination_url
        : updates.destination_url,
    s2s_postback_url:
      updates.s2s_postback_url === undefined
        ? existing.s2s_postback_url
        : updates.s2s_postback_url,
    group_id: updates.group_id === undefined ? existing.group_id : updates.group_id,
    traffic_source_id:
      updates.traffic_source_id === undefined
        ? existing.traffic_source_id
        : updates.traffic_source_id,
    tags: updates.tags === undefined ? existing.tags : updates.tags,
    status: updates.status ?? existing.status,
  };

  await db
    .prepare(
      `UPDATE programs SET name = ?, destination_url = ?, s2s_postback_url = ?,
       group_id = ?, traffic_source_id = ?, tags = ?, status = ?
       WHERE id = ? AND user_id = ?`,
    )
    .bind(
      next.name,
      next.destination_url,
      next.s2s_postback_url,
      next.group_id,
      next.traffic_source_id,
      next.tags,
      next.status,
      programId,
      userId,
    )
    .run();

  return getProgram(db, programId, userId);
}

export async function listAffiliates(db: D1Database, programId: string): Promise<Affiliate[]> {
  const { results } = await db
    .prepare(
      "SELECT id, program_id, name, code, created_at FROM affiliates WHERE program_id = ? ORDER BY created_at DESC",
    )
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

export async function createAffiliateWithUniqueCode(
  db: D1Database,
  input: { program_id: string; name: string },
  maxAttempts = 8,
): Promise<Affiliate> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const affiliate: Affiliate = {
      id: id("aff"),
      program_id: input.program_id,
      name: input.name,
      code: affiliateCode(),
      created_at: Date.now(),
    };
    try {
      await createAffiliate(db, affiliate);
      return affiliate;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }
  throw new Error("Could not generate unique affiliate code");
}

export async function getClickById(db: D1Database, clickId: string): Promise<Click | null> {
  return db
    .prepare(
      "SELECT id, program_id, affiliate_id, ip, user_agent, created_at FROM clicks WHERE id = ?",
    )
    .bind(clickId)
    .first<Click>();
}

export async function recordClick(
  db: D1Database,
  click: {
    id: string;
    program_id: string;
    affiliate_id: string;
    ip?: string | null;
    user_agent?: string | null;
    path_id?: string | null;
    lander_id?: string | null;
    offer_id?: string | null;
    created_at: number;
  },
) {
  await db
    .prepare(
      `INSERT INTO clicks (
        id, program_id, affiliate_id, ip, user_agent,
        path_id, lander_id, offer_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      click.id,
      click.program_id,
      click.affiliate_id,
      click.ip ?? null,
      click.user_agent ?? null,
      click.path_id ?? null,
      click.lander_id ?? null,
      click.offer_id ?? null,
      click.created_at,
    )
    .run();
}

export type ConversionInput = {
  id: string;
  program_id: string;
  affiliate_id: string;
  click_id?: string | null;
  order_id: string;
  amount_cents: number;
  status?: string;
  status2?: string | null;
  currency?: string;
  created_at: number;
};

export async function recordConversion(
  db: D1Database,
  conversion: ConversionInput,
): Promise<"created" | "duplicate"> {
  try {
    await db
      .prepare(
        `INSERT INTO conversions (
          id, program_id, affiliate_id, click_id, order_id,
          amount_cents, status, status2, currency, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        conversion.id,
        conversion.program_id,
        conversion.affiliate_id,
        conversion.click_id ?? null,
        conversion.order_id,
        conversion.amount_cents,
        conversion.status ?? "lead",
        conversion.status2 ?? null,
        conversion.currency ?? "USD",
        conversion.created_at,
      )
      .run();
    return "created";
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return "duplicate";
    }
    throw error;
  }
}

export async function listClickLog(
  db: D1Database,
  programId: string,
  limit = 50,
  offset = 0,
): Promise<ClickLogRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
        c.id, c.program_id, c.affiliate_id, c.ip, c.user_agent, c.created_at,
        a.name AS affiliate_name, a.code AS affiliate_code,
        EXISTS(SELECT 1 FROM conversions cv WHERE cv.click_id = c.id) AS converted
      FROM clicks c
      JOIN affiliates a ON a.id = c.affiliate_id
      WHERE c.program_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(programId, limit, offset)
    .all<{
      id: string;
      program_id: string;
      affiliate_id: string;
      ip: string | null;
      user_agent: string | null;
      created_at: number;
      affiliate_name: string;
      affiliate_code: string;
      converted: number;
    }>();

  return (results ?? []).map((r) => ({
    id: r.id,
    program_id: r.program_id,
    affiliate_id: r.affiliate_id,
    ip: r.ip,
    user_agent: r.user_agent,
    created_at: r.created_at,
    affiliate_name: r.affiliate_name,
    affiliate_code: r.affiliate_code,
    converted: Boolean(r.converted),
  }));
}

export async function listConversionLog(
  db: D1Database,
  programId: string,
  limit = 50,
  offset = 0,
): Promise<ConversionLogRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
        cv.id, cv.program_id, cv.affiliate_id, cv.click_id, cv.order_id,
        cv.amount_cents, cv.status, cv.status2, cv.currency, cv.created_at,
        a.name AS affiliate_name, a.code AS affiliate_code
      FROM conversions cv
      JOIN affiliates a ON a.id = cv.affiliate_id
      WHERE cv.program_id = ?
      ORDER BY cv.created_at DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(programId, limit, offset)
    .all<ConversionLogRow>();
  return results ?? [];
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
