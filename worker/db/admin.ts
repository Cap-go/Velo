export type PlatformOverview = {
  users: number;
  programs: number;
  affiliates: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
};

export type PlatformUserRow = {
  id: string;
  email: string;
  name: string | null;
  is_platform_admin: number;
  program_count: number;
  created_at: number;
};

export async function getPlatformOverview(db: D1Database): Promise<PlatformOverview> {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM programs) AS programs,
        (SELECT COUNT(*) FROM affiliates) AS affiliates,
        (SELECT COUNT(*) FROM clicks) AS clicks,
        (SELECT COUNT(*) FROM conversions) AS conversions,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM conversions) AS revenue_cents`,
    )
    .first<PlatformOverview>();
  return (
    row ?? {
      users: 0,
      programs: 0,
      affiliates: 0,
      clicks: 0,
      conversions: 0,
      revenue_cents: 0,
    }
  );
}

export async function listPlatformUsers(
  db: D1Database,
  limit = 50,
  offset = 0,
): Promise<{ users: PlatformUserRow[]; total: number }> {
  const totalRow = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  const { results } = await db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.name,
        u.is_platform_admin,
        u.created_at,
        (SELECT COUNT(*) FROM programs p WHERE p.user_id = u.id) AS program_count
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(limit, offset)
    .all<PlatformUserRow>();

  return { users: results ?? [], total: totalRow?.total ?? 0 };
}
