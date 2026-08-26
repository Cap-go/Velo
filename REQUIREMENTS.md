# Velo requirements

Velo is a **standalone self-serve affiliate tracker** for indie and SaaS founders. It is **not** Capgo’s existing Affonso program and does not replace it.

## Product (MVP)

A merchant can:

1. Sign up with email/password
2. Create a **program** with a **destination URL** (where affiliates send traffic)
3. Add **affiliates** and get unique tracking links
4. See **dashboard stats**: affiliates, clicks, conversions, revenue, conversion rate

An affiliate shares a short link. A click records the visit and sends the visitor to the merchant site with attribution attached.

## Done means (checklist)

### Working app

| Requirement | Implementation |
| --- | --- |
| Email/password auth | `/api/auth/signup`, `/login`, JWT session cookie |
| Program + destination URL | `POST /api/programs` (required `destination_url`), `PATCH /api/programs/:id` |
| Affiliates + unique links | `POST /api/programs/:id/affiliates` → `/r/:code` |
| Redirect | `/r/:code` → program destination; optional `?url=` **same host only**; append `velo_ref=<code>` on Location |
| Conversions | `POST /api/v1/convert` with `X-Program-Secret` + `affiliate_code`; idempotent by `(program_id, order_id)` |
| CORS | `POST` + `OPTIONS` on `/api/v1/convert`, `Access-Control-Allow-Origin: *` |
| Merchant snippet | `GET /api/v1/snippet` — browser-only: stores `velo_ref` in `localStorage` (conversions are server-side) |
| Dashboard stats | `/app` + `GET /api/programs/:id/stats` |

### Site structure

- **`/`** — marketing landing (product, pricing copy, signup CTA)
- **`/app`** — merchant dashboard
- **`/signup`**, **`/login`** — auth pages

### Tests (`bun run test`)

Must pass in CI:

1. **Full path**: signup → program → affiliate → click → convert (`affiliate_code`, no cookie) → stats
2. **Redirect rejection**: off-host `?url=` and `javascript:` schemes return 400
3. **`velo_ref`**: 302 `Location` includes `velo_ref=<code>`
4. **CORS**: OPTIONS preflight on `/api/v1/convert`

### CI / deploy

- **CI** (`.github/workflows/ci.yml`): on PRs and `main` — typecheck, test, build
- **Deploy** (`.github/workflows/deploy.yml`): runs only after **CI succeeds** on a push to `main` (`workflow_run`) — build, D1 migrations, `wrangler deploy`

**Cloudflare target**

| Resource | Value |
| --- | --- |
| Worker name | `velo` |
| D1 database | `velo-db` |
| D1 database ID | `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` |
| Account | Digital shift — `9ee3d7479a3c359681e3fab2c8cb22c0` |
| Production URL | `https://velo.capgo.app` |

**GitHub secrets (required before first prod deploy)**

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploy worker + apply D1 migrations |
| `CLOUDFLARE_ACCOUNT_ID` | `9ee3d7479a3c359681e3fab2c8cb22c0` |
| `JWT_SECRET` | Session signing; **must be set in production** (auth fails closed without it) |

Also set Worker secret if not wired by CI:

```bash
bunx wrangler secret put JWT_SECRET --env production
```

Attach custom domain `velo.capgo.app` in Cloudflare dashboard after first deploy.

## Out of scope (MVP)

Do **not** build these unless explicitly requested:

- Stripe / billing / paid-plan checkout
- Affiliate payouts
- Social login (OAuth)
- Plan-limit enforcement (Free vs Pro limits are marketing copy only)
- Replacing or integrating with **Affonso**

## Non-goals / security

- **No open redirects** — redirects bound to program destination; `?url=` same-host only
- **No cross-site cookie attribution** — merchant conversions use `velo_ref` query + `affiliate_code`, not Velo cookies
- **No dummy D1 IDs** — use the real `database_id` in `wrangler.toml` or create DB and update both sections
- **No pinned action SHAs** — GitHub Actions use version tags (`@v4`, `@v3`, etc.)
- **No secrets in git** — use GitHub secrets, `.dev.vars` locally (gitignored)

## Reference

Operational commands and merchant flow: [README.md](./README.md)

Agent workflow: [AGENTS.md](./AGENTS.md)
