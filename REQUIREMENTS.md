# Velo requirements

Velo is a **standalone self-serve affiliate tracker** for indie and SaaS founders. It is **not** Capgo’s existing Affonso program.

## Product (MVP)

A merchant can sign up, create programs with destination URLs, add affiliates, and view dashboard stats.

## Done means (checklist)

### Working app

| Requirement | Implementation |
| --- | --- |
| Email/password auth | `/api/auth/signup`, `/login`, JWT session cookie on **console.capve.app** |
| Program + destination URL | `POST /api/programs` |
| Affiliates + unique links | `https://console.capve.app/r/:code` |
| Redirect | `/r/:code` → destination + `velo_ref` |
| Conversions | `POST /api/v1/convert` with `X-Program-Secret` + `affiliate_code` |
| Dashboard stats | `/app` on console host |

### Site structure (production)

| Host | Routes |
| --- | --- |
| **https://capve.app** | `/` landing only; `/login`, `/signup`, `/app` redirect to console |
| **https://console.capve.app** | `/login`, `/signup`, `/app`; `/` → `/app` |

**www.capve.app** redirects to apex **https://capve.app**.

Local dev: all routes on `http://localhost:5173`.

Auth session cookies use `Domain=console.capve.app` in production (not sent to capve.app).

### CI / deploy

- **CI**: typecheck, test, build on PRs and `main`
- **Deploy**: after CI on `main` (or manual dispatch)

**Cloudflare target**

| Resource | Value |
| --- | --- |
| Worker name | `velo` |
| D1 database | `velo-db` — `eb916c67-6e45-4798-a6d9-c0e47f99cb8d` |
| Account | Digital shift — `9ee3d7479a3c359681e3fab2c8cb22c0` |
| Landing URL (`APP_URL`) | `https://capve.app` |
| Console URL (`CONSOLE_URL`) | `https://console.capve.app` |
| Tracking links | `https://console.capve.app/r/{code}` |

Attach **`capve.app`**, **`www.capve.app`**, and **`console.capve.app`** to worker **`velo`**.

## Non-goals

- **No `*.capgo.app`** product URLs
- **No workers.dev** as the product URL
- **No dashboard on capve.app** or marketing landing on console.capve.app
- No open redirects, no cross-site cookie attribution for conversions

## Reference

[README.md](./README.md) · [AGENTS.md](./AGENTS.md)
