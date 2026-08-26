export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_URL: string;
  JWT_SECRET?: string;
};

export type User = {
  id: string;
  email: string;
  created_at: number;
};

export type Program = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  api_key: string;
  destination_url: string | null;
  created_at: number;
};

export type Affiliate = {
  id: string;
  program_id: string;
  name: string;
  code: string;
  created_at: number;
};

export type AffiliateStats = Affiliate & {
  clicks: number;
  conversions: number;
  revenue_cents: number;
  conversion_rate: number;
};

export type ProgramStats = {
  program: Program;
  totals: {
    clicks: number;
    conversions: number;
    revenue_cents: number;
    conversion_rate: number;
  };
  affiliates: AffiliateStats[];
};
