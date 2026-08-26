# Velo

Simple self-serve affiliate tracking for indie and SaaS founders.

**Requirements & agent guide:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [AGENTS.md](./AGENTS.md)

Velo lets merchants create affiliate programs, give partners unique tracking links, record click-throughs with first-party cookies, and attribute conversions via a JS snippet or POST API.

## Stack

- **Frontend**: React + Vite + Tailwind (marketing site + dashboard)
- **Backend**: Cloudflare Worker (Hono)
- **Database**: Cloudflare D1
- **Deploy**: One Worker project with static assets (`wrangler.toml`)

Routes:

- `/` — marketing landing page
- `/app` — merchant dashboard
- `/r/:code` — affiliate redirect to the program destination (+ optional same-host `?url=`)
- `/api/v1/convert` — conversion tracking (`X-Program-Key` + `affiliate_code`)

Each program stores a **destination URL**. Tracking links redirect there and append `velo_ref=<code>` so merchant checkout can attribute cross-domain conversions via `localStorage` (see `/api/v1/snippet`).

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for local D1 and deploy

## Local development

```bash
bun install
bun run db:migrate:local
bun run dev
```

Open http://localhost:5173

The Vite dev server runs the Worker and frontend together via `@cloudflare/vite-plugin`.

Optional local secrets (create `.dev.vars`, never commit):

```bash
JWT_SECRET=your-local-secret
```

## Tests

Integration tests exercise the full tracking path using `@cloudflare/vitest-pool-workers`:

```bash
bun run test
```

Coverage:

1. Sign up merchant
2. Create program
3. Create affiliate + tracking link
4. Hit redirect → records click + sets `_velo_ref` cookie
5. POST conversion → attributes to affiliate
6. Verify dashboard stats (clicks, conversions, revenue, conversion rate)
7. Verify idempotent conversion by order id

## Production deploy (Cloudflare)

### 1. Cloudflare D1 database

This repo is wired to a D1 database named `velo-db`. The `database_id` in `wrangler.toml` must match a database in your Cloudflare account.

If you need a fresh database:

```bash
bunx wrangler d1 create velo-db
```

Update `database_id` in `wrangler.toml` (both default and `[env.production]` sections) with the ID from that command.

Apply migrations remotely:

```bash
bunx wrangler d1 migrations apply velo-db --remote
```

### 2. GitHub secrets

Add these repository secrets for `.github/workflows/deploy.yml`:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers + D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `JWT_SECRET` | Session signing secret for production auth |

### 3. Deploy

Pushes to `main` run CI then deploy via GitHub Actions.

Manual deploy:

```bash
bun run build
bunx wrangler deploy --env production
```

Set production vars/secrets:

```bash
bunx wrangler secret put JWT_SECRET --env production
```

Update `APP_URL` in `wrangler.toml` under `[env.production.vars]` to your production domain.

## Merchant flow

1. Sign up at `/signup`
2. Create a program in `/app`
3. Add an affiliate and copy the generated `/r/{code}?url=...` link
4. Share the link — clicks are tracked and a first-party cookie is set
5. On conversion, call `/api/v1/convert` with `X-Program-Key` and `{ order_id, amount }`

Example conversion request:

```bash
curl -X POST https://YOUR_DOMAIN/api/v1/convert \
  -H "Content-Type: application/json" \
  -H "X-Program-Key: pk_..." \
  -d '{"order_id":"order_123","amount":49,"affiliate_code":"abc123"}'
```

The hosted snippet at `/api/v1/snippet` reads `velo_ref` from the query string into `localStorage` and sends it as `affiliate_code`.

## Pricing (product)

- **Free**: 1 program, up to 5 affiliates (enforcement can be added later)
- **Pro ($19/mo)**: unlimited programs/affiliates (billing not wired in MVP)

Tracking works without Stripe in this first version.

## License

Proprietary — Cap-go / Martin Donadieu
