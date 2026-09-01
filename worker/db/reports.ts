import type { Program } from "../types";
import { computeMetrics, costForTraffic, type ReportFilters } from "../lib/metrics";

export type CampaignReportRow = Program & {
  group_name: string | null;
  traffic_source_name: string | null;
  cost_type: "cpc" | "cpm" | "cpa" | null;
  default_cost_cents: number;
  metrics: ReturnType<typeof computeMetrics>;
};

export type TrendPoint = {
  date: string;
  clicks: number;
  lp_clicks: number;
  leads: number;
  revenue_cents: number;
  cost_cents: number;
};

type ProgramRow = Program & {
  group_name: string | null;
  traffic_source_name: string | null;
  cost_type: "cpc" | "cpm" | "cpa" | null;
  default_cost_cents: number | null;
};

function programWhere(userId: string, filters: ReportFilters, alias = "p") {
  const clauses = [`${alias}.user_id = ?`];
  const binds: Array<string | number> = [userId];

  if (filters.group_id) {
    clauses.push(`${alias}.group_id = ?`);
    binds.push(filters.group_id);
  }
  if (filters.traffic_source_id) {
    clauses.push(`${alias}.traffic_source_id = ?`);
    binds.push(filters.traffic_source_id);
  }
  if (filters.status) {
    clauses.push(`${alias}.status = ?`);
    binds.push(filters.status);
  }

  return { sql: clauses.join(" AND "), binds };
}

function clickTimeClause(filters: ReportFilters, alias = "c") {
  const clauses: string[] = [];
  const binds: number[] = [];
  if (filters.from != null) {
    clauses.push(`${alias}.created_at >= ?`);
    binds.push(filters.from);
  }
  if (filters.to != null) {
    clauses.push(`${alias}.created_at <= ?`);
    binds.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    binds,
  };
}

function conversionTimeClause(filters: ReportFilters, alias = "cv") {
  const clauses: string[] = [];
  const binds: number[] = [];
  if (filters.from != null) {
    clauses.push(`${alias}.created_at >= ?`);
    binds.push(filters.from);
  }
  if (filters.to != null) {
    clauses.push(`${alias}.created_at <= ?`);
    binds.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    binds,
  };
}

const PROGRAM_COLUMNS =
  "p.id, p.user_id, p.name, p.slug, p.api_key, p.destination_url, p.s2s_postback_url, p.campaign_key, p.group_id, p.traffic_source_id, p.tags, p.status, p.created_at";

export async function listCampaignReports(
  db: D1Database,
  userId: string,
  filters: ReportFilters,
): Promise<CampaignReportRow[]> {
  const where = programWhere(userId, filters);
  const { results } = await db
    .prepare(
      `SELECT ${PROGRAM_COLUMNS},
        g.name AS group_name,
        ts.name AS traffic_source_name,
        ts.cost_type,
        ts.default_cost_cents
       FROM programs p
       LEFT JOIN groups g ON g.id = p.group_id
       LEFT JOIN traffic_sources ts ON ts.id = p.traffic_source_id
       WHERE ${where.sql}
       ORDER BY p.created_at DESC`,
    )
    .bind(...where.binds)
    .all<ProgramRow>();

  const clickTime = clickTimeClause(filters);
  const convTime = conversionTimeClause(filters);
  const rows: CampaignReportRow[] = [];

  for (const program of results ?? []) {
    const clicks = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM clicks c
         WHERE c.program_id = ?${clickTime.sql}`,
      )
      .bind(program.id, ...clickTime.binds)
      .first<{ count: number }>();

    const lpClicks = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM clicks c
         WHERE c.program_id = ? AND c.lander_id IS NOT NULL${clickTime.sql}`,
      )
      .bind(program.id, ...clickTime.binds)
      .first<{ count: number }>();

    const conversions = await db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS revenue
         FROM conversions cv
         WHERE cv.program_id = ?${convTime.sql}`,
      )
      .bind(program.id, ...convTime.binds)
      .first<{ count: number; revenue: number }>();

    const clickCount = clicks?.count ?? 0;
    const lpClickCount = lpClicks?.count ?? 0;
    const leadCount = conversions?.count ?? 0;
    const revenueCents = conversions?.revenue ?? 0;
    const costType = program.cost_type ?? "cpc";
    const defaultCost = program.default_cost_cents ?? 0;
    const costCents = costForTraffic(costType, defaultCost, clickCount, leadCount);

    rows.push({
      ...program,
      group_name: program.group_name,
      traffic_source_name: program.traffic_source_name,
      cost_type: program.cost_type,
      default_cost_cents: defaultCost,
      metrics: computeMetrics({
        clicks: clickCount,
        lp_clicks: lpClickCount,
        leads: leadCount,
        revenue_cents: revenueCents,
        cost_cents: costCents,
      }),
    });
  }

  return rows;
}

export async function getCampaignTrends(
  db: D1Database,
  programId: string,
  userId: string,
  filters: ReportFilters,
): Promise<TrendPoint[]> {
  const program = await db
    .prepare(`SELECT id, traffic_source_id FROM programs WHERE id = ? AND user_id = ?`)
    .bind(programId, userId)
    .first<{ id: string; traffic_source_id: string | null }>();
  if (!program) return [];

  const source = program.traffic_source_id
    ? await db
        .prepare("SELECT cost_type, default_cost_cents FROM traffic_sources WHERE id = ?")
        .bind(program.traffic_source_id)
        .first<{ cost_type: "cpc" | "cpm" | "cpa"; default_cost_cents: number }>()
    : null;

  const clickTime = clickTimeClause(filters, "c");
  const convTime = conversionTimeClause(filters, "cv");

  const clickRows = await db
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', c.created_at / 1000, 'unixepoch') AS day,
        COUNT(*) AS clicks,
        SUM(CASE WHEN c.lander_id IS NOT NULL THEN 1 ELSE 0 END) AS lp_clicks
       FROM clicks c
       WHERE c.program_id = ?${clickTime.sql}
       GROUP BY day
       ORDER BY day ASC`,
    )
    .bind(programId, ...clickTime.binds)
    .all<{ day: string; clicks: number; lp_clicks: number }>();

  const convRows = await db
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', cv.created_at / 1000, 'unixepoch') AS day,
        COUNT(*) AS leads,
        COALESCE(SUM(amount_cents), 0) AS revenue_cents
       FROM conversions cv
       WHERE cv.program_id = ?${convTime.sql}
       GROUP BY day
       ORDER BY day ASC`,
    )
    .bind(programId, ...convTime.binds)
    .all<{ day: string; leads: number; revenue_cents: number }>();

  const byDay = new Map<string, TrendPoint>();

  for (const row of clickRows.results ?? []) {
    byDay.set(row.day, {
      date: row.day,
      clicks: row.clicks,
      lp_clicks: row.lp_clicks,
      leads: 0,
      revenue_cents: 0,
      cost_cents: 0,
    });
  }

  for (const row of convRows.results ?? []) {
    const existing = byDay.get(row.day) ?? {
      date: row.day,
      clicks: 0,
      lp_clicks: 0,
      leads: 0,
      revenue_cents: 0,
      cost_cents: 0,
    };
    existing.leads = row.leads;
    existing.revenue_cents = row.revenue_cents;
    byDay.set(row.day, existing);
  }

  const costType = source?.cost_type ?? "cpc";
  const defaultCost = source?.default_cost_cents ?? 0;

  return [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      ...point,
      cost_cents: costForTraffic(costType, defaultCost, point.clicks, point.leads),
    }));
}

export async function exportClickLogCsv(
  db: D1Database,
  programId: string,
  userId: string,
  filters: ReportFilters,
): Promise<Array<Array<string | number>>> {
  const program = await db
    .prepare("SELECT id FROM programs WHERE id = ? AND user_id = ?")
    .bind(programId, userId)
    .first();
  if (!program) return [];

  const clickTime = clickTimeClause(filters, "c");
  const { results } = await db
    .prepare(
      `SELECT
        c.id, c.created_at, a.code AS affiliate_code, a.name AS affiliate_name,
        c.ip, c.lander_id, c.offer_id, c.path_id,
        EXISTS(SELECT 1 FROM conversions cv WHERE cv.click_id = c.id) AS converted
       FROM clicks c
       JOIN affiliates a ON a.id = c.affiliate_id
       WHERE c.program_id = ?${clickTime.sql}
       ORDER BY c.created_at DESC`,
    )
    .bind(programId, ...clickTime.binds)
    .all<{
      id: string;
      created_at: number;
      affiliate_code: string;
      affiliate_name: string;
      ip: string | null;
      lander_id: string | null;
      offer_id: string | null;
      path_id: string | null;
      converted: number;
    }>();

  return (results ?? []).map((row) => [
    row.id,
    new Date(row.created_at).toISOString(),
    row.affiliate_code,
    row.affiliate_name,
    row.ip ?? "",
    row.lander_id ?? "",
    row.offer_id ?? "",
    row.path_id ?? "",
    row.converted ? "yes" : "no",
  ]);
}

export async function exportConversionsCsv(
  db: D1Database,
  programId: string,
  userId: string,
  filters: ReportFilters,
): Promise<Array<Array<string | number>>> {
  const program = await db
    .prepare("SELECT id FROM programs WHERE id = ? AND user_id = ?")
    .bind(programId, userId)
    .first();
  if (!program) return [];

  const convTime = conversionTimeClause(filters, "cv");
  const { results } = await db
    .prepare(
      `SELECT
        cv.order_id, cv.click_id, cv.created_at, cv.amount_cents, cv.status, cv.status2,
        cv.currency, a.code AS affiliate_code, a.name AS affiliate_name
       FROM conversions cv
       JOIN affiliates a ON a.id = cv.affiliate_id
       WHERE cv.program_id = ?${convTime.sql}
       ORDER BY cv.created_at DESC`,
    )
    .bind(programId, ...convTime.binds)
    .all<{
      order_id: string;
      click_id: string | null;
      created_at: number;
      amount_cents: number;
      status: string;
      status2: string | null;
      currency: string;
      affiliate_code: string;
      affiliate_name: string;
    }>();

  return (results ?? []).map((row) => [
    row.order_id,
    row.click_id ?? "",
    new Date(row.created_at).toISOString(),
    (row.amount_cents / 100).toFixed(2),
    row.status,
    row.status2 ?? "",
    row.currency,
    row.affiliate_code,
    row.affiliate_name,
  ]);
}
