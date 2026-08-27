# AGENTS.md — Velo

Read **[REQUIREMENTS.md](./REQUIREMENTS.md)** first. It defines what Velo is, what “done” means, and what is out of scope.

Velo = **open-source, self-hosted** affiliate tracker for indie/SaaS. **Not** Capgo Affonso. **Not** a SaaS — no pricing, no email/password login.

## Repo map

| Path | Purpose |
| --- | --- |
| `worker/` | Hono API, redirect, convert, Access auth |
| `worker/lib/access.ts` | Cloudflare Access JWT validation |
| `src/` | React UI (homepage `/`, dashboard `/app`) |
| `src/lib/constants.ts` | Deploy button + GitHub URLs |
| `migrations/` | D1 schema |
| `tests/tracking.test.ts` | Integration tests (Workers pool) |
| `wrangler.toml` | Worker + D1 + production vars |
| `.github/workflows/` | CI + deploy |

Stack: TypeScript, Bun, Vite, Cloudflare Worker + D1, `@cloudflare/vite-plugin`.

## Production URL

**https://capve.app** — this repo’s demo/homepage install: landing `/`, dashboard `/app`, API, tracking `/r/{code}`.

Do **not** use `*.workers.dev`, `*.capgo.app`, or split hosts (e.g. `console.capve.app`).

## Local commands

```bash
bun install
bun run db:migrate:local
bun run dev          # http://localhost:5173
bun run test         # must pass before PR
bun run typecheck
bun run build
```

Local dev skips Access when `APP_URL` is localhost.

## Finish deploy (for a later agent)

1. **Secrets:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from Cap-go **org** secrets (already set).
2. **D1:** `velo-db` — id `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` on account `9ee3d7479a3c359681e3fab2c8cb22c0` (see `wrangler.toml`).
3. Merge PR to `main` (only when CI green and review approved).
4. Deploy workflow: migrations → `wrangler deploy --env production --var APP_URL:https://capve.app`
5. Martin configures Zero Trust Access (path-based on `/app*` + `/api/programs*`) and sets `TEAM_DOMAIN` + `POLICY_AUD` on the Worker.
6. Smoke test at **https://capve.app**:
   - `/` loads homepage with Deploy button
   - `/r/:code` → merchant URL with `velo_ref=`
   - POST convert with `X-Program-Secret` + `affiliate_code` → stats update
   - `/app` works after Access is configured

## Rules when changing code

- Match existing patterns; minimal diff
- Do not add Stripe, pricing, payouts, social login, or Affonso integration unless asked
- Keep redirect allowlist logic — never redirect to arbitrary hosts
- Conversions: `affiliate_code` + `X-Program-Secret` (server-only); CORS on convert
- Dashboard APIs fail closed without valid Access JWT in production (`worker/lib/access.ts`)
- Public routes must stay public: `/`, `/r/*`, `/api/v1/convert`, `/api/v1/snippet`
- Run `bun run test` and keep CI green
- Use version tags for GitHub Actions, not SHA pins
- Do not commit secrets or placeholder D1 IDs
- Do not add Cloudflare secrets to the Velo repo — they live at Cap-go org level
- Do **not** split landing vs dashboard onto separate hostnames unless explicitly requested

## PR workflow

- Branch: `cursor/<name>-8e4f`
- Open PR → wait for CI → fix review comments → do not merge unless asked
- Do not deploy to production yourself; document what Martin must do
