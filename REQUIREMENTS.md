# Velo requirements

Velo is an **open-source, self-hosted affiliate tracker** for indie and SaaS founders. Deploy it on your own Cloudflare account. It is **not** Capgo’s existing Affonso program and does not replace it.

## Product

A self-hosted Velo instance lets a merchant:

1. Open `/app` (protected by **Cloudflare Access** in production)
2. Create a **program** with a **destination URL** (where affiliates send traffic)
3. Add **affiliates** and get unique tracking links
4. See **dashboard stats**: affiliates, clicks, conversions, revenue, conversion rate

An affiliate shares a short link. A click records the visit and sends the visitor to the merchant site with attribution attached.

There is **no SaaS signup**, **no email/password login**, and **no pricing**.

## Done means (checklist)

### Working app

| Requirement | Implementation |
| --- | --- |
| Dashboard auth | Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`); `TEAM_DOMAIN` + `POLICY_AUD` on Worker |
| Program + destination URL | `POST /api/programs` (required `destination_url`), `PATCH /api/programs/:id` |
| Affiliates + unique links | `POST /api/programs/:id/affiliates` → `{APP_URL}/r/:code` |
| Redirect | `/r/:code` → program destination; optional `?url=` **same host only**; append `velo_ref=<code>` on Location |
| Conversions | `POST /api/v1/convert` with `X-Program-Secret` + `affiliate_code`; idempotent by `(program_id, order_id)` |
| CORS | `POST` + `OPTIONS` on `/api/v1/convert`, `Access-Control-Allow-Origin: *` |
| Merchant snippet | `GET /api/v1/snippet` — browser-only: stores `velo_ref` in `localStorage` (conversions are server-side) |
| Dashboard stats | `/app` + `GET /api/programs/:id/stats` |

### Site structure

- **`/`** — project homepage (what Velo is + how to install; Deploy to Cloudflare button)
- **`/app`** — merchant dashboard (Cloudflare Access in production)

**Public routes** (must stay unauthenticated): `/`, `/r/:code`, `POST /api/v1/convert` + OPTIONS, `GET /api/v1/snippet`, `GET /api/health`.

**Protected** (Access + Worker JWT validation): `/app`, `/api/programs*`, `GET /api/auth/me`.

### Install

- **One-click:** [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/Cap-go/Velo) provisions Worker + D1 on the visitor’s account.
- **This repo’s CI** deploys to `capve.app` (Digital Shift demo/homepage install) using the existing D1 id in `wrangler.toml`.
- After deploy, configure **path-based** Zero Trust Access on `/app*` and `/api/programs*` (not the whole Worker).

### Tests (`bun run test`)

Must pass in CI:

1. **Full path**: create program → affiliate → click → convert (`affiliate_code`, no cookie) → stats (localhost bypasses Access)
2. **Redirect rejection**: off-host `?url=` and `javascript:` schemes return 400
3. **`velo_ref`**: 302 `Location` includes `velo_ref=<code>`
4. **CORS**: OPTIONS preflight on `/api/v1/convert`
5. **Access fail-closed**: dashboard APIs return 401 when `APP_URL` is not localhost and Access vars are unset

### CI / deploy

- **CI** (`.github/workflows/ci.yml`): on PRs and `main` — typecheck, test, build
- **Deploy** (`.github/workflows/deploy.yml`): runs only after **CI succeeds** on a push to `main` (`workflow_run`) — build, D1 migrations, `wrangler deploy`

**Cloudflare target (capve.app demo install)**

| Resource | Value |
| --- | --- |
| Worker name | `velo` |
| D1 database | `velo-db` (already created) |
| D1 database ID | `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` |
| Account | Digital shift — `9ee3d7479a3c359681e3fab2c8cb22c0` |
| Production URL | `https://capve.app` |

**GitHub secrets**

| Secret | Where | Status |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cap-go **org** secrets | Already set |
| `CLOUDFLARE_ACCOUNT_ID` | Cap-go **org** secrets | Already set |

Set on the Worker (not required for landing/tracking until you want `/app`):

| Var | Purpose |
| --- | --- |
| `TEAM_DOMAIN` | `https://<team>.cloudflareaccess.com` |
| `POLICY_AUD` | Access application audience tag |

`JWT_SECRET` is no longer used. `/app` may return 403 until Access is configured — that is expected.

Attach **`capve.app`** to worker **`velo`**. Optional: redirect **`www.capve.app`** → apex.

## Out of scope

Do **not** build these unless explicitly requested:

- Stripe / billing / pricing tiers
- Email/password or social login
- Affiliate payouts
- Plan-limit enforcement
- Replacing or integrating with **Affonso**
- Host splits (e.g. separate console subdomain)

## Non-goals / security

- **No open redirects** — redirects bound to program destination; `?url=` same-host only
- **No cross-site cookie attribution** — merchant conversions use `velo_ref` query + `affiliate_code`, not Velo cookies
- **Path-based Access only** — wrapping the whole Worker breaks `/r/*` and convert
- **No dummy D1 IDs** in this repo’s production config
- **No pinned action SHAs** — GitHub Actions use version tags
- **No secrets in git** — use Worker vars / GitHub org secrets
- **No workers.dev or capgo.app product URLs** for marketing — `capve.app` is this project’s homepage/demo

## Reference

Operational commands: [README.md](./README.md)

Agent workflow: [AGENTS.md](./AGENTS.md)
