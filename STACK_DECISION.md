# Food Intelligence Platform — stack decision

**Implemented Backend 2.0 MVP:** Node.js 24, NestJS 11, TypeScript, REST/OpenAPI, PostgreSQL 16, `pg`, Drizzle ORM, Argon2id, signed short-lived JWT access tokens, hashed rotating refresh sessions, Decimal.js, Jest/Supertest, ESLint, Prettier, Docker Compose definitions and GitHub Actions. This is a modular monolith with one transactional PostgreSQL source of truth.

**Repository separation:** `apps/api` is the only application implemented here. `apps/docs` holds authored content for a future Astro 7 documentation-only renderer. `apps/web` is the intended Next.js frontend but does not exist yet. `legacy` preserves the Express/MongoDB prototype without reuse of its architecture or insecure auth. `packages/shared` is deferred until shared contracts are needed.

**Deferred:** Redis/BullMQ, Socket.IO, online payments and billing, carts/reviews, advanced ML/AI, forecasting persistence, external integrations and production email delivery. The API exposes transparent rules-based **Baseline recommendation** only. Astro must never host backend APIs, authentication, database access or business logic.

**Rationale:** PostgreSQL transactions and exact numeric types support batch stock, allocations, returns, waste and tenant-bound relationships. NestJS provides domain module boundaries, DTO validation and global guards without splitting stock transactions across services. Docker Compose defines repeatable local dependencies; CI runs migrations and tests against isolated PostgreSQL. Production deployment, backup/restore rehearsal, shared rate limiting, email provider, and frontend remain separate work.

See [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md), [DATABASE_DESIGN.md](DATABASE_DESIGN.md), [CODEBASE_MAP.md](CODEBASE_MAP.md) and [README.md](README.md).
