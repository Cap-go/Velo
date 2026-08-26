export type User = { id: string; email: string };

export type Program = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  api_key: string;
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
  me: () => request<{ user: User | null }>("/api/auth/me"),
  signup: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  programs: () => request<{ programs: Program[] }>("/api/programs"),
  createProgram: (name: string) =>
    request<{ program: Program }>("/api/programs", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
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
