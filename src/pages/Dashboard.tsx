import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ErrorBox, Field, Shell } from "../components/ui";
import {
  api,
  formatMoney,
  formatPercent,
  type Affiliate,
  type Program,
  type ProgramStats,
} from "../lib/api";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { user, loading, setUser } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [programName, setProgramName] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .programs()
      .then(({ programs: items }) => {
        setPrograms(items);
        if (items[0]) setSelectedId(items[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load programs"));
  }, [user]);

  useEffect(() => {
    if (!selectedId) {
      setStats(null);
      return;
    }
    api
      .stats(selectedId)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats"));
  }, [selectedId, lastLink]);

  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-6 py-16 text-[var(--velo-muted)]">Loading...</div>
      </Shell>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  async function createProgram(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { program } = await api.createProgram(programName);
      setPrograms((prev) => [program, ...prev]);
      setSelectedId(program.id);
      setProgramName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create program");
    } finally {
      setBusy(false);
    }
  }

  async function createAffiliate(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const { tracking_url } = await api.createAffiliate(selectedId, affiliateName);
      setAffiliateName("");
      setLastLink(tracking_url);
      const nextStats = await api.stats(selectedId);
      setStats(nextStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create affiliate");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  const selectedProgram = programs.find((p) => p.id === selectedId) ?? stats?.program;

  return (
    <Shell
      cta={
        <>
          <span className="hidden text-sm text-[var(--velo-muted)] sm:inline">{user.email}</span>
          <button className="btn btn-ghost" onClick={logout} type="button">
            Log out
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-[var(--velo-muted)]">
            Manage programs, affiliates, and see performance at a glance.
          </p>
        </div>

        <ErrorBox message={error} />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="card p-5">
            <h2 className="font-semibold">Programs</h2>
            <form className="mt-4 space-y-3" onSubmit={createProgram}>
              <Field
                label="New program name"
                placeholder="Acme SaaS affiliates"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                required
              />
              <button className="btn btn-primary w-full" disabled={busy} type="submit">
                Create program
              </button>
            </form>
            <div className="mt-5 space-y-2">
              {programs.length === 0 && (
                <p className="text-sm text-[var(--velo-muted)]">No programs yet.</p>
              )}
              {programs.map((program) => (
                <button
                  key={program.id}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedId === program.id
                      ? "border-[var(--velo-accent)] bg-[var(--velo-accent-soft)]"
                      : "border-[var(--velo-border)]"
                  }`}
                  onClick={() => setSelectedId(program.id)}
                  type="button"
                >
                  <div className="font-medium">{program.name}</div>
                  <div className="mono text-[var(--velo-muted)]">{program.slug}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            {selectedProgram ? (
              <>
                <div className="card p-5">
                  <h2 className="font-semibold">Program details</h2>
                  <p className="mt-2 text-sm text-[var(--velo-muted)]">
                    Use this API key in your conversion snippet or server-side POST.
                  </p>
                  <div className="mono mt-3 break-all rounded-xl bg-[var(--velo-bg)] p-3">
                    {selectedProgram.api_key}
                  </div>
                  <pre className="mono mt-4 overflow-x-auto rounded-xl bg-[var(--velo-bg)] p-3 text-xs leading-relaxed">
                    {`fetch("${window.location.origin}/api/v1/convert", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Program-Key": "${selectedProgram.api_key}"
  },
  credentials: "include",
  body: JSON.stringify({ order_id: "order_123", amount: 49 })
});`}
                  </pre>
                </div>

                <div className="card p-5">
                  <h2 className="font-semibold">Add affiliate</h2>
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={createAffiliate}>
                    <Field
                      label="Affiliate name"
                      placeholder="Jane Partner"
                      value={affiliateName}
                      onChange={(e) => setAffiliateName(e.target.value)}
                      required
                    />
                    <button
                      className="btn btn-primary self-end sm:mt-7"
                      disabled={busy}
                      type="submit"
                    >
                      Create link
                    </button>
                  </form>
                  {lastLink && (
                    <p className="mono mt-4 break-all rounded-xl bg-[var(--velo-accent-soft)] p-3 text-sm">
                      {lastLink}
                    </p>
                  )}
                </div>

                {stats && (
                  <>
                    <div className="stat-grid">
                      <div className="card stat">
                        <div className="stat-label">Clicks</div>
                        <div className="stat-value">{stats.totals.clicks}</div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Conversions</div>
                        <div className="stat-value">{stats.totals.conversions}</div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Revenue</div>
                        <div className="stat-value">
                          {formatMoney(stats.totals.revenue_cents)}
                        </div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Conversion rate</div>
                        <div className="stat-value">
                          {formatPercent(stats.totals.conversion_rate)}
                        </div>
                      </div>
                    </div>

                    <div className="card overflow-hidden p-5">
                      <h2 className="font-semibold">Affiliates</h2>
                      <div className="mt-4 overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Code</th>
                              <th>Clicks</th>
                              <th>Conversions</th>
                              <th>Revenue</th>
                              <th>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.affiliates.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-[var(--velo-muted)]">
                                  No affiliates yet.
                                </td>
                              </tr>
                            )}
                            {stats.affiliates.map((affiliate) => (
                              <AffiliateRow key={affiliate.id} affiliate={affiliate} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="card p-8 text-[var(--velo-muted)]">
                Create your first program to start tracking affiliates.
              </div>
            )}
          </section>
        </div>

        <p className="text-sm text-[var(--velo-muted)]">
          Need the marketing site? <Link className="underline" to="/">Back to home</Link>
        </p>
      </div>
    </Shell>
  );
}

function AffiliateRow({ affiliate }: { affiliate: ProgramStats["affiliates"][number] }) {
  return (
    <tr>
      <td>{affiliate.name}</td>
      <td className="mono">{affiliate.code}</td>
      <td>{affiliate.clicks}</td>
      <td>{affiliate.conversions}</td>
      <td>{formatMoney(affiliate.revenue_cents)}</td>
      <td>{formatPercent(affiliate.conversion_rate)}</td>
    </tr>
  );
}
