import { Link } from "react-router-dom";
import { Shell } from "../components/ui";
import { GITHUB_REPO_URL, PRODUCTION_APP_URL } from "../lib/constants";

const features = [
  {
    title: "Campaign reporting",
    body: "Binom-style metrics — clicks, cost, profit, ROI — with CSV export and daily trends.",
  },
  {
    title: "Smart routing",
    body: "Paths, rotations, landers, and offers. Route traffic like a pro tracker without the legacy UI.",
  },
  {
    title: "AI-ready",
    body: "Documented APIs and MCP-friendly workflows so agents can manage campaigns for you.",
  },
];

export function LandingPage() {
  return (
    <Shell
      cta={
        <>
          <Link className="btn btn-ghost" to="/docs">
            Docs
          </Link>
          <Link className="btn btn-ghost" to="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" to="/register">
            Get started
          </Link>
        </>
      }
    >
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-[var(--velo-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--velo-accent)]">
              Modern performance marketing
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight">
              Affiliate & campaign tracking built for speed.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--velo-muted)]">
              Capve tracks clicks, conversions, and campaign ROI with Binom-class reporting — hosted,
              simple pricing, and AI-ready workflows.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link className="btn btn-primary" to="/register">
                Start free
              </Link>
              <Link className="btn btn-secondary" to="/login">
                Sign in
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-sm font-semibold text-[var(--velo-muted)]">Live flow</p>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed">
              <li>
                <strong>1.</strong> Create your Capve account.
              </li>
              <li>
                <strong>2.</strong> Add a campaign and traffic sources in{" "}
                <span className="mono rounded bg-[var(--velo-accent-soft)] px-2 py-1">/app</span>
              </li>
              <li>
                <strong>3.</strong> Affiliate shares{" "}
                <span className="mono rounded bg-[var(--velo-accent-soft)] px-2 py-1">
                  your-domain/r/code
                </span>
              </li>
              <li>
                <strong>4.</strong> Click records visit → checkout posts conversion → stats update.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="card p-6">
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-3 text-[var(--velo-muted)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="card p-8 text-center">
          <h2 className="text-3xl font-bold">Ready to track smarter?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--velo-muted)]">
            Create a free account, add your first campaign, and start measuring performance in minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link className="btn btn-primary" to="/register">
              Create free account
            </Link>
            <Link className="btn btn-secondary" to="/docs">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-[var(--velo-muted)]">
        Capve — performance marketing at{" "}
        <a className="underline" href={PRODUCTION_APP_URL}>
          capve.app
        </a>
        . Source on{" "}
        <a className="underline" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </footer>
    </Shell>
  );
}
