# Velo

Simple self-serve affiliate tracking for indie and SaaS founders.

**Requirements & agent guide:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [AGENTS.md](./AGENTS.md)

Velo lets merchants create affiliate programs, give partners unique tracking links, record click-throughs with first-party cookies, and attribute conversions via a JS snippet or POST API.

## Stack

- **Frontend**: React + Vite + Tailwind (marketing site + dashboard)
- **Backend**: Cloudflare Worker (Hono)
- **Database**: Cloudflare D1
- **Deploy**: One Worker project with static assets (`wrangler.toml`)

**Production hosts** (one Worker, host-based routing):

| Host | Purpose |
| --- | --- |
| **https://capve.app** | Marketing landing only (`/`) |
| **https://console.capve.app** | SaaS — signup, login, dashboard, API, tracking links |

Optional: redirect **www.capve.app** → **https://capve.app**.

Shared on both hosts (same Worker):

- `/r/:code` — affiliate redirect (+ optional same-host `?url=`)
- `/api/v1/convert` — server-side conversion tracking

Tracking links and merchant API examples use **console.capve.app** so **capve.app** stays a clean marketing site.

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for local D1 and deploy

## Local development

```bash
bun install
bun run db:migrate:local
bun run dev
```

Open http://localhost:5173 (all routes on one origin in dev).

Optional local secrets (create `.dev.vars`, never commit):

```bash
JWT_SECRET=your-local-secret
```

## Tests

```bash
bun run test
```

## Production deploy (Cloudflare)

| URL | Role |
| --- | --- |
| **https://capve.app** | Landing |
| **https://console.capve.app** | App + tracking links + convert API |

Attach **`capve.app`**, **`www.capve.app`**, and **`console.capve.app`** to worker **`velo`** in Cloudflare (custom domains in `wrangler.toml`).

```bash
bun run build
bunx wrangler d1 migrations apply velo-db --remote --env production
bun run deploy
```

Session cookies are scoped to **`console.capve.app`** only (not the marketing apex).

## Merchant flow

1. Sign up at **https://console.capve.app/signup**
2. Create a program in `/app`
3. Copy the generated `https://console.capve.app/r/{code}` link
4. On conversion, POST from your server to `https://console.capve.app/api/v1/convert`

Example:

```bash
curl -X POST https://console.capve.app/api/v1/convert \
  -H "Content-Type: application/json" \
  -H "X-Program-Secret: sk_..." \
  -d '{"order_id":"order_123","amount":49,"affiliate_code":"abc123"}'
```

## License

Proprietary — Cap-go / Martin Donadieu
