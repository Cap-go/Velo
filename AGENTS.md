# AGENTS.md — Velo

Read **[REQUIREMENTS.md](./REQUIREMENTS.md)** first. It defines what Velo is, what “done” means, and what is out of scope.

Velo = standalone affiliate tracker for indie/SaaS. **Not** Capgo Affonso.

## Repo map

| Path | Purpose |
| --- | --- |
| `worker/` | Hono API, redirect, convert, auth |
| `src/` | React UI (landing `/`, dashboard `/app`) |
| `migrations/` | D1 schema |
| `tests/tracking.test.ts` | Integration tests (Workers pool) |
| `wrangler.toml` | Worker + D1 + production vars |
| `.github/workflows/` | CI + deploy |

Stack: TypeScript, Bun, Vite, Cloudflare Worker + D1, `@cloudflare/vite-plugin`.

## Local commands

```bash
bun install
bun run db:migrate:local
bun run dev          # http://localhost:5173
bun run test         # must pass before PR
bun run typecheck
bun run build
```

Optional `.dev.vars`: `JWT_SECRET=...` (local only; gitignored)

## Finish deploy (for a later agent)

Prerequisites are in REQUIREMENTS.md. Steps:

1. **Secrets:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` come from Cap-go **org** secrets (already set). `JWT_SECRET` is on the **Cap-go/Velo** repo (already set).
2. **D1:** `velo-db` already exists — id `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` on account `9ee3d7479a3c359681e3fab2c8cb22c0` (see `wrangler.toml`).
3. Merge PR to `main` (only when CI green and review approved).
4. Deploy workflow runs after CI passes: migrations → `wrangler deploy --env production`
5. Note the live URL from deploy output (`https://velo.<account-subdomain>.workers.dev`) — no custom domain
6. Smoke test:
   - `/` loads landing
   - Signup → create program (save **convert secret** shown once) → add affiliate
   - Open `/r/:code` → lands on merchant URL with `velo_ref=`
   - POST convert from server with `X-Program-Secret` + `affiliate_code` → stats update

Manual deploy (if needed):

```bash
bun run build
bunx wrangler d1 migrations apply velo-db --remote
bun run deploy   # or: bunx wrangler deploy --env production
```

## Rules when changing code

- Match existing patterns; minimal diff
- Do not add Stripe, payouts, social login, or Affonso integration unless asked
- Keep redirect allowlist logic — never redirect to arbitrary hosts
- Conversions: `affiliate_code` + `X-Program-Secret` (server-only); CORS on convert; no reliance on cross-site cookies
- `JWT_SECRET` must fail closed when `APP_URL` is not localhost (see `worker/lib/auth.ts`)
- Run `bun run test` and keep CI green
- Use version tags for GitHub Actions, not SHA pins
- Do not commit secrets or placeholder D1 IDs
- Do not add Cloudflare secrets to the Velo repo — they live at Cap-go org level

## PR workflow

- Branch: `cursor/<name>-db69`
- Open draft PR → wait for CI → mark ready → fix review comments → do not merge unless asked
- Do not deploy to production yourself; document what Martin must do
