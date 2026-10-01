# Food Intelligence Platform

A multi-tenant REST backend for food businesses to manage products, suppliers, locations, inventory batches, sales, returns, expiry, waste, discounts, and basic analytics. The product model is defined in [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md).

**Implementation status:** `apps/api` contains the Backend 2.0 NestJS MVP. `apps/docs` contains documentation content, not an Astro runtime. The Next.js frontend (`apps/web`), online payments, carts, reviews, advanced ML/AI, Redis/BullMQ, Socket.IO, and external integrations are deferred. The original Express/MongoDB prototype is preserved in `legacy/` for reference; it is not imported by the API. No MongoDB data was migrated or deleted.

## Repository

- `apps/api/` — NestJS, TypeScript, Drizzle schema/migrations, REST/OpenAPI, Jest/Supertest integration tests.
- `apps/docs/` — authored documentation content; Astro 7 renderer remains future documentation work only.
- `docker/` and `docker-compose.yml` — API, PostgreSQL, and Mailpit local stack.
- `.github/workflows/api.yml` — lint, typecheck, migration, PostgreSQL-backed tests, build, and production dependency audit.
- `legacy/` — unchanged prototype source/package files. Its former credential-like example is kept locally as an ignored file and is not part of the Backend 2.0 configuration.

The GitHub repository is [jobayermannan/food-intelligence-platform](https://github.com/jobayermannan/food-intelligence-platform). The active local checkout is `E:\Food related software\food-intelligence-platform`. Existing Git history was retained.

## Local development

Use Node.js 24 and npm. Copy `.env.example` to `.env`, replace `JWT_SECRET` with a unique random value of at least 32 bytes, and keep `.env` untracked. For a fully containerized setup, run `docker compose up --build`. The API listens on port 3000, PostgreSQL on host port 5434 (container port 5432), and the development email sink at `http://localhost:8025`. Compose runs migrations before API startup. The example database password is for local development only.

For a host-run API with containerized dependencies, start `docker compose up postgres mailpit`, run `npm ci`, `npm run db:migrate`, then `npm run dev`. Set `SMTP_HOST=localhost` and `DATABASE_URL=postgres://food:food_dev_only@localhost:5434/food_intelligence` in the host process or `.env`. Readiness is `GET /health/ready`; liveness is `GET /health/live`. OpenAPI UI is `/api/docs`.

The verification email contains a single-use token for `POST /api/v1/auth/verify-email`. Access tokens belong in memory; the server sets the HttpOnly refresh cookie. Refresh/logout require an `Origin` equal to `APP_ORIGIN`. For local HTTP only, set `COOKIE_SECURE=false`; keep secure cookies enabled for HTTPS deployment.

## Quality checks

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm audit --omit=dev --audit-level=high`. Integration tests require an **isolated PostgreSQL database whose name ends in `_test`** and `DATABASE_URL` set to it. Run `npm run db:migrate` against that database first. Tests truncate its `users` table and dependent data; never point tests at development or production data.

`apps/api/drizzle/` contains the generated migrations. Migration 0000 deliberately creates unique indexes before composite foreign keys because PostgreSQL requires referenced keys to exist first. Later migrations retain generated snapshots; never run `db:generate` and apply a new file without reviewing the SQL ordering.

## Boundaries and caveats

Every business-owned request checks an active membership and, for staff/viewer, location grants. The shared PostgreSQL schema uses business IDs and composite relationships for isolation. Stock changes use transactions, row locks, immutable movements, and numeric quantities/costs. Rules-based discount recommendations are labelled **Baseline recommendation** and do not mutate prices or stock. Online payments are absent.

The in-process rate limiter is suitable for a single MVP API instance; production scaling needs a shared limiter and operations review. Mailpit is a development sink, not a production email provider. Docker image/Compose execution requires a working Docker daemon; CI validates the API against PostgreSQL. See [USER_MANUAL.md](USER_MANUAL.md), [CODEBASE_MAP.md](CODEBASE_MAP.md), [DATABASE_DESIGN.md](DATABASE_DESIGN.md), [MIGRATION_PLAN.md](MIGRATION_PLAN.md), and [security audit](BACKEND_AUDIT.md).
