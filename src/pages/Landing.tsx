import { Link } from "react-router-dom";
import { Shell } from "../components/ui";

const features = [
  {
    title: "Unique affiliate links",
    body: "Give each partner a short tracking link that sets a first-party cookie on click-through.",
  },
  {
    title: "Conversion tracking",
    body: "Record sales with a tiny JS snippet or a simple POST API. Order IDs are idempotent.",
  },
  {
    title: "Clear dashboard",
    body: "See clicks, conversions, revenue, and conversion rate per affiliate in one place.",
  },
];

export function LandingPage() {
  return (
    <Shell
      cta={
        <>
          <Link className="btn btn-ghost" to="/login">
            Log in
          </Link>
          <Link className="btn btn-primary" to="/signup">
            Start free
          </Link>
        </>
      }
    >
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-[var(--velo-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--velo-accent)]">
              Affiliate tracking for indie SaaS
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight">
              Launch an affiliate program without building attribution yourself.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--velo-muted)]">
              Velo gives merchants a dashboard, affiliates unique links, and a reliable
              click-to-conversion path you can ship this week.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn btn-primary" to="/signup">
                Create your program
              </Link>
              <a className="btn btn-secondary" href="#pricing">
                See pricing
              </a>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-sm font-semibold text-[var(--velo-muted)]">Live flow</p>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed">
              <li>
                <strong>1.</strong> Merchant creates a program and adds affiliates.
              </li>
              <li>
                <strong>2.</strong> Affiliate shares{" "}
                <span className="mono rounded bg-[var(--velo-accent-soft)] px-2 py-1">
                  /r/code?url=...
                </span>
              </li>
              <li>
                <strong>3.</strong> Click sets cookie + records the visit.
              </li>
              <li>
                <strong>4.</strong> Checkout posts conversion → dashboard updates.
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

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-[var(--velo-muted)]">
            Start free while you validate. Upgrade when affiliates drive revenue.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-6">
            <p className="text-sm font-semibold text-[var(--velo-muted)]">Free</p>
            <p className="mt-2 text-4xl font-bold">$0</p>
            <ul className="mt-5 space-y-2 text-[var(--velo-muted)]">
              <li>1 program</li>
              <li>Up to 5 affiliates</li>
              <li>Full click + conversion tracking</li>
            </ul>
            <Link className="btn btn-secondary mt-6" to="/signup">
              Start free
            </Link>
          </article>
          <article className="card border-[var(--velo-accent)] p-6">
            <p className="text-sm font-semibold text-[var(--velo-accent)]">Pro</p>
            <p className="mt-2 text-4xl font-bold">$19/mo</p>
            <ul className="mt-5 space-y-2 text-[var(--velo-muted)]">
              <li>Unlimited programs & affiliates</li>
              <li>Priority support</li>
              <li>Export-ready stats (coming soon)</li>
            </ul>
            <Link className="btn btn-primary mt-6" to="/signup">
              Start free, upgrade later
            </Link>
          </article>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-[var(--velo-muted)]">
        Built for founders who want affiliate tracking that just works.
      </footer>
    </Shell>
  );
}
