import { Link } from "react-router-dom";
import { Shell } from "../components/ui";
import {
  DEPLOY_BUTTON_IMAGE,
  DEPLOY_BUTTON_URL,
  GITHUB_REPO_URL,
  PRODUCTION_APP_URL,
} from "../lib/constants";

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
    title: "Self-hosted dashboard",
    body: "Run on your Cloudflare account. Open /app right after deploy — add Cloudflare Access later for production hardening.",
  },
];

const installSteps = [
  "Click Deploy to Cloudflare and provision the Worker + D1 on your account.",
  "Set APP_URL to your custom domain (or workers.dev URL) in wrangler vars.",
  "Open /app, create a program, save the convert secret, and add affiliates.",
  "Optional: protect /app and /api/programs* with Cloudflare Access, then set TEAM_DOMAIN + POLICY_AUD.",
];

export function LandingPage() {
  return (
    <Shell
      cta={
        <>
          <a className="btn btn-ghost" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="btn btn-primary" to="/app">
            Dashboard
          </Link>
        </>
      }
    >
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-[var(--velo-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--velo-accent)]">
              Open-source · self-hosted
            </p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight">
              Affiliate tracking you deploy on your own Cloudflare account.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--velo-muted)]">
              Velo is a lightweight affiliate tracker for indie SaaS. No SaaS signup, no pricing
              tiers — one-click deploy, open /app, and start tracking affiliates.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href={DEPLOY_BUTTON_URL} target="_blank" rel="noreferrer">
                <img
                  src={DEPLOY_BUTTON_IMAGE}
                  alt="Deploy to Cloudflare Workers"
                  width={166}
                  height={32}
                />
              </a>
              <a className="btn btn-secondary" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                View source
              </a>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-sm font-semibold text-[var(--velo-muted)]">Live flow</p>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed">
              <li>
                <strong>1.</strong> Deploy Velo to your Cloudflare account.
              </li>
              <li>
                <strong>2.</strong> Create a program and add affiliates in{" "}
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

      <section id="install" className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Install on Cloudflare</h2>
          <p className="mt-2 text-[var(--velo-muted)]">
            One-click deploy provisions the Worker and D1 database on your account. You own the
            data and the bill.
          </p>
        </div>
        <div className="card p-6">
          <a href={DEPLOY_BUTTON_URL} target="_blank" rel="noreferrer">
            <img
              src={DEPLOY_BUTTON_IMAGE}
              alt="Deploy to Cloudflare Workers"
              width={166}
              height={32}
            />
          </a>
          <ol className="mt-6 space-y-3 text-[var(--velo-muted)]">
            {installSteps.map((step, index) => (
              <li key={step}>
                <strong>{index + 1}.</strong> {step}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-[var(--velo-muted)]">
            Cloudflare Access is optional but recommended for production. When configured, add
            path-based Access on <span className="mono">/app*</span> and{" "}
            <span className="mono">/api/programs*</span> only (not the whole Worker), then set{" "}
            <span className="mono">TEAM_DOMAIN</span> and <span className="mono">POLICY_AUD</span>{" "}
            on the Worker. See{" "}
            <a
              className="underline"
              href="https://developers.cloudflare.com/workers/configuration/cloudflare-access/"
              target="_blank"
              rel="noreferrer"
            >
              Cloudflare Access for Workers
            </a>
            .
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-[var(--velo-muted)]">
        Velo — open source at{" "}
        <a className="underline" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
          github.com/Cap-go/Velo
        </a>
        . Demo install:{" "}
        <a className="underline" href={PRODUCTION_APP_URL}>
          capve.app
        </a>
        .
      </footer>
    </Shell>
  );
}
