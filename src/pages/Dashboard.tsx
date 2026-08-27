import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { appBaseUrl } from "../lib/constants";

export function DashboardPage() {
  const { user, accessRequired, loading } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [programName, setProgramName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [editDestinationUrl, setEditDestinationUrl] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [convertSecretOnce, setConvertSecretOnce] = useState("");
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

    let cancelled = false;
    setStats(null);

    api
      .stats(selectedId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, lastLink]);

  useEffect(() => {
    const program = programs.find((p) => p.id === selectedId) ?? stats?.program;
    setEditDestinationUrl(program?.destination_url ?? "");
  }, [selectedId, programs, stats?.program]);

  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-6 py-16 text-[var(--velo-muted)]">Loading...</div>
      </Shell>
    );
  }

  if (!user && accessRequired) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-bold">Sign in with Cloudflare Access</h1>
          <p className="mt-3 text-[var(--velo-muted)]">
            This dashboard requires Cloudflare Access. Sign in to continue.
          </p>
          <p className="mt-4 text-sm text-[var(--velo-muted)]">
            <a className="underline" href="/app">
              Try again
            </a>
            {" · "}
            <Link className="underline" to="/">
              Back to home
            </Link>
          </p>
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-6 py-16 text-[var(--velo-muted)]">Loading...</div>
      </Shell>
    );
  }

  async function createProgram(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { program, convert_secret } = await api.createProgram(programName, destinationUrl);
      setPrograms((prev) => [program, ...prev]);
      setSelectedId(program.id);
      setConvertSecretOnce(convert_secret);
      setProgramName("");
      setDestinationUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create program");
    } finally {
      setBusy(false);
    }
  }

  async function saveDestination(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const { program } = await api.updateProgram(selectedId, {
        destination_url: editDestinationUrl,
      });
      setPrograms((prev) => prev.map((item) => (item.id === program.id ? program : item)));
      if (stats) setStats({ ...stats, program });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update destination");
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

  const selectedProgram = programs.find((p) => p.id === selectedId) ?? stats?.program;
  const visibleStats = stats && stats.program.id === selectedId ? stats : null;

  return (
    <Shell
      cta={
        <span className="hidden text-sm text-[var(--velo-muted)] sm:inline">{user.email}</span>
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
              <Field
                label="Destination URL"
                type="url"
                placeholder="https://yourapp.com"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
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
                  {convertSecretOnce && selectedProgram.id === selectedId && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        Conversion secret (shown once — store server-side)
                      </p>
                      <p className="mono mt-2 break-all text-sm text-amber-950">
                        {convertSecretOnce}
                      </p>
                    </div>
                  )}
                  <form className="mt-4 space-y-3" onSubmit={saveDestination}>
                    <Field
                      label="Destination URL"
                      type="url"
                      placeholder="https://yourapp.com/pricing"
                      value={editDestinationUrl}
                      onChange={(e) => setEditDestinationUrl(e.target.value)}
                      required
                    />
                    <button className="btn btn-secondary" disabled={busy} type="submit">
                      Save destination
                    </button>
                  </form>
                  <p className="mt-4 text-sm text-[var(--velo-muted)]">
                    Tracking links redirect here and append{" "}
                    <span className="mono">velo_ref</span> for merchant-site attribution.
                  </p>
                  <p className="mt-4 text-sm text-[var(--velo-muted)]">
                    Record conversions from your server with{" "}
                    <span className="mono">X-Program-Secret</span> (never in browser JS).
                  </p>
                  <pre className="mono mt-4 overflow-x-auto rounded-xl bg-[var(--velo-bg)] p-3 text-xs leading-relaxed">
                    {`// Server-side checkout handler
const affiliateCode = req.body.affiliate_code; // from form / localStorage

await fetch("${appBaseUrl()}/api/v1/convert", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Program-Secret": process.env.CAPVE_CONVERT_SECRET
  },
  body: JSON.stringify({
    order_id: "order_123",
    amount: 49,
    affiliate_code: affiliateCode
  })
});`}
                  </pre>
                  <p className="mt-3 text-sm text-[var(--velo-muted)]">
                    Browser attribution snippet (stores <span className="mono">velo_ref</span>{" "}
                    only):{" "}
                    <span className="mono">{`${appBaseUrl()}/api/v1/snippet`}</span>
                  </p>
                </div>

                <div className="card p-5">
                  <h2 className="font-semibold">Add affiliate</h2>
                  {!selectedProgram.destination_url && (
                    <p className="mt-2 text-sm text-amber-700">
                      Set a destination URL before creating affiliate links.
                    </p>
                  )}
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
                      disabled={busy || !selectedProgram.destination_url}
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

                {visibleStats && (
                  <>
                    <div className="stat-grid">
                      <div className="card stat">
                        <div className="stat-label">Clicks</div>
                        <div className="stat-value">{visibleStats.totals.clicks}</div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Conversions</div>
                        <div className="stat-value">{visibleStats.totals.conversions}</div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Revenue</div>
                        <div className="stat-value">
                          {formatMoney(visibleStats.totals.revenue_cents)}
                        </div>
                      </div>
                      <div className="card stat">
                        <div className="stat-label">Conversion rate</div>
                        <div className="stat-value">
                          {formatPercent(visibleStats.totals.conversion_rate)}
                        </div>
                      </div>
                    </div>

                    <div className="card overflow-hidden p-5">
                      <h2 id="affiliates-heading" className="font-semibold">
                        Affiliates
                      </h2>
                      <div className="mt-4 overflow-x-auto">
                        <table className="table" aria-labelledby="affiliates-heading">
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
                            {visibleStats.affiliates.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-[var(--velo-muted)]">
                                  No affiliates yet.
                                </td>
                              </tr>
                            )}
                            {visibleStats.affiliates.map((affiliate) => (
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
