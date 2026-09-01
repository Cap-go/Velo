export type User = { id: string; email: string };

export type Program = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  api_key: string;
  destination_url: string | null;
  s2s_postback_url: string | null;
  created_at: number;
};

export type ClickLogRow = {
  id: string;
  program_id: string;
  affiliate_id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: number;
  affiliate_name: string;
  affiliate_code: string;
  converted: boolean;
};

export type ConversionLogRow = {
  id: string;
  program_id: string;
  affiliate_id: string;
  click_id: string | null;
  order_id: string;
  amount_cents: number;
  status: string;
  status2: string | null;
  currency: string;
  created_at: number;
  affiliate_name: string;
  affiliate_code: string;
};

export type ProgramTracking = {
  postback_url: string;
  s2s_postback_url: string | null;
  offer_url_macro: string;
  redirect_params: string[];
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null; access_required?: boolean }>("/api/auth/me"),
  programs: () => request<{ programs: Program[] }>("/api/programs"),
  createProgram: (name: string, destinationUrl: string) =>
    request<{ program: Program; convert_secret: string }>("/api/programs", {
      method: "POST",
      body: JSON.stringify({ name, destination_url: destinationUrl }),
    }),
  updateProgram: (
    programId: string,
    data: { name?: string; destination_url?: string; s2s_postback_url?: string | null },
  ) =>
    request<{ program: Program }>(`/api/programs/${programId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  tracking: (programId: string) =>
    request<{ tracking: ProgramTracking }>(`/api/programs/${programId}/tracking`),
  clicks: (programId: string, limit = 50) =>
    request<{ clicks: ClickLogRow[] }>(`/api/programs/${programId}/clicks?limit=${limit}`),
  conversions: (programId: string, limit = 50) =>
    request<{ conversions: ConversionLogRow[] }>(
      `/api/programs/${programId}/conversions?limit=${limit}`,
    ),
  stats: (programId: string) => request<ProgramStats>(`/api/programs/${programId}/stats`),
  createAffiliate: (programId: string, name: string) =>
    request<{ affiliate: Affiliate; tracking_url: string }>(
      `/api/programs/${programId}/affiliates`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
    ),
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
