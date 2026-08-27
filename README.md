# Velo

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Cap-go/Velo)

Open-source, self-hosted affiliate tracking for indie and SaaS founders. Deploy on your Cloudflare account — no SaaS signup, no pricing tiers.

**Repo:** https://github.com/Cap-go/Velo · **Requirements:** [REQUIREMENTS.md](./REQUIREMENTS.md) · **Agents:** [AGENTS.md](./AGENTS.md)

Velo lets you run affiliate programs on infrastructure you control: unique tracking links, click-through cookies, and server-side conversion attribution.

## Stack

- **Frontend**: React + Vite + Tailwind (homepage + dashboard)
- **Backend**: Cloudflare Worker (Hono)
- **Database**: Cloudflare D1
- **Auth**: Cloudflare Access (optional) for `/app` and program APIs
- **Deploy**: One Worker + static assets (`wrangler.toml`)

## Routes

| Path | Access |
| --- | --- |
| `/` | Public — project homepage + install instructions |
| `/app` | Open after deploy; optional Cloudflare Access hardening |
| `/r/:code` | Public — affiliate redirect |
| `/api/v1/convert` | Public — conversion API (`X-Program-Secret`) |
| `/api/v1/snippet` | Public — browser attribution snippet |
| `/api/programs/*` | Instance owner after deploy; optional Cloudflare Access |

Each program stores a **destination URL**. Tracking links redirect there and append `velo_ref=<code>` for merchant-site attribution.

## Quick install

1. Click **Deploy to Cloudflare** above (or use the [deploy button docs](https://developers.cloudflare.com/workers/platform/deploy-buttons/)).
2. Set `APP_URL` to your hostname in Worker vars / `wrangler.toml`.
3. Open `/app` — create a program (save the **convert secret** shown once), add affiliates.

**Production hardening:** Run `bun run setup-access` to create path-based Cloudflare Access on `/app*`, `/api/programs*`, and `/api/auth*` (not the whole Worker), then set Worker vars `TEAM_DOMAIN` and `POLICY_AUD` so the dashboard enforces Access JWTs:

```bash
export CLOUDFLARE_API_TOKEN=...   # needs Access: Apps and Policies Write + Workers write
export CLOUDFLARE_ACCOUNT_ID=...
export APP_HOST=your-domain.com
# optional: export ACCESS_ALLOWED_EMAILS=you@example.com
# optional: export ACCESS_ALLOWED_DOMAINS=example.com
bun run setup-access
```

The **Setup Cloudflare Access** GitHub Action (`.github/workflows/setup-access.yml`) runs the same script after each production deploy on this repo. You can also dispatch it manually from the Actions tab.

**Important:** Do not enable Access on the entire Worker — `/r/*`, `/api/v1/convert`, `/api/v1/snippet`, and `/api/health` must stay public.

## Local development

```bash
bun install
bun run db:migrate:local
bun run dev
```

Open http://localhost:5173 — dashboard works immediately without Access configuration.

## Tests

```bash
bun run test
bun run typecheck
bun run build
```

Integration tests cover program → affiliate → click → convert → stats, redirect security, CORS, and optional Access behavior.

## capve.app (demo install)

https://capve.app is this project’s public homepage and demo deployment on the Digital Shift Cloudflare account. Other users deploy their own copies via the button above.

| Resource | Value |
| --- | --- |
| Worker | `velo` |
| D1 | `velo-db` — `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` |
| Account | `9ee3d7479a3c359681e3fab2c8cb22c0` |

CI deploys on merge to `main` (after tests pass). Build uses `CLOUDFLARE_ENV=production` so custom domains stay in `dist/velo/wrangler.json`.

Manual deploy:

```bash
bun run build
bunx wrangler d1 migrations apply velo-db --remote --env production
bun run deploy
```

## Merchant flow

1. Open `/app` (works immediately after deploy; sign in via Cloudflare Access when configured)
2. Create a program with a destination URL
3. Add an affiliate and copy the `https://your-domain/r/{code}` link
4. Share the link — clicks are tracked and a first-party cookie is set
5. On conversion, POST from your **server** to `/api/v1/convert` with `X-Program-Secret` and `{ order_id, amount, affiliate_code }`

```bash
curl -X POST https://your-domain/api/v1/convert \
  -H "Content-Type: application/json" \
  -H "X-Program-Secret: sk_..." \
  -d '{"order_id":"order_123","amount":49,"affiliate_code":"abc123"}'
```

The browser snippet at `/api/v1/snippet` stores `velo_ref` from the query string into `localStorage`.

## License

Open source — see [github.com/Cap-go/Velo](https://github.com/Cap-go/Velo).
