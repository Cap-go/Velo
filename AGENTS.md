# AGENTS.md — Velo

Read **[REQUIREMENTS.md](./REQUIREMENTS.md)** first.

## Production URLs

| Host | Role |
| --- | --- |
| **https://capve.app** | Marketing landing only |
| **https://console.capve.app** | Signup, login, dashboard, `/r/:code`, convert API |
| **www.capve.app** | Redirect to apex |

Never use `*.capgo.app` or `*.workers.dev` as product URLs.

Wrangler production vars: `APP_URL=https://capve.app`, `CONSOLE_URL=https://console.capve.app`.

Auth cookies: `Domain=console.capve.app` in production (`worker/lib/hosts.ts` + `worker/lib/auth.ts`).

## Repo map

| Path | Purpose |
| --- | --- |
| `worker/lib/hosts.ts` | Host routing + auth cookie domain |
| `src/lib/constants.ts` | Frontend URL helpers |
| `src/App.tsx` | Host-based React routes |

## Local commands

```bash
bun install
bun run db:migrate:local
bun run dev
bun run test
bun run build
```

## Deploy

```bash
bun run deploy
# wrangler deploy --env production --var APP_URL:https://capve.app --var CONSOLE_URL:https://console.capve.app
```

Smoke test:
- **capve.app/** — landing; `/signup` redirects to console
- **console.capve.app/signup** → program → affiliate link on console host
- Session cookie has `Domain=console.capve.app`

## Rules

- Do not merge unless asked
- Do not split hosts differently unless explicitly requested
- Run `bun run test` before push
