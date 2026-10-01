# Food Intelligence Platform — stack decisions

Status: **TARGET BACKEND 2.0 — design only**. Repository target: `food-intelligence-platform`. Current Express/JavaScript/MongoDB is a **Legacy Prototype / Reference**, not a domain or architecture foundation. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) owns the independent business design, MVP, permissions, and assumptions. See [audit](BACKEND_AUDIT.md) for observed legacy behavior.

| Decision | Rationale and boundary |
| --- | --- |
| TypeScript | Explicit contracts for commands, money/quantity representations, providers, and events; types complement runtime validation |
| NestJS | Consistent module ownership, dependency injection, guards, lifecycle hooks, and test seams |
| PostgreSQL | Transactions and relational constraints fit batches, allocations, business ownership, and financial history |
| Drizzle + pg | Typed schema/query ownership with reviewable SQL migrations and explicit transactional behavior |
| One ORM | No TypeORM exists to preserve. Drizzle is the sole target ORM; avoid conflicting metadata, migrations, and transaction ownership |
| MongoDB reference only | Leave source untouched. Import only when approved real data needs it; no default compatibility layer. Relational stock/sales constraints independently justify PostgreSQL |
| Redis — deferred | Cache/queue infrastructure only when needed; never authoritative stock or financial history. Not an MVP startup dependency |
| BullMQ — deferred | Retriable asynchronous work when workload requires it; initial expiry/analytics use bounded database queries |
| Socket.IO — deferred | Authenticated post-commit notifications only for a proven realtime need; REST remains the MVP boundary |
| REST + OpenAPI | Versioned, inspectable contracts for Next.js clients and agents |
| class-validator + class-transformer | One primary API DTO validation strategy: allowlisted fields, explicit conversion, nested validation, bounds; database constraints enforce durable invariants |
| Authentication | MVP assumption: verified local email/password, Argon2id, short-lived access tokens, hashed rotating refresh sessions, revocation, fresh membership/location checks; see domain lifecycle |
| Payment adapter — deferred | MVP records food-business sales without gateway calls. Future provider-neutral adapter starts with Stripe Test Mode for restaurant orders; platform billing is a separate undecided product |
| Modular monolith | Stock/sales/waste transactions remain simple; clear module ownership permits later extraction without premature distributed transactions |
| Docker + Compose | Reproducible local/test dependencies and deployment images; not present yet |
| GitHub Actions + quality gate | Repeatable tests, migration rehearsal, scans, and gated artifacts. Select SonarCloud/SonarQube based on hosting and credentials |
| Jest + Supertest | Unit, transactional integration, and HTTP contract/security tests |
| Next.js | Main frontend at future `apps/web/`; no frontend work authorized here |
| Astro 7 | Documentation-only at future `apps/docs/`; Markdown stays in `docs/` until a reviewed move. No backend APIs, database access, authentication, or business operations |
| Future Python/ML service | Optional model adapter after sufficient trustworthy history; core NestJS stays TypeScript |

## Consistency decisions

Use PostgreSQL as stock/order/return source of truth. Inventory, sale allocations, waste, and ledger changes commit atomically through a shared unit of work. Other modules call Inventory instead of writing its tables. Outbox, workers, and gateway are deferred; when introduced, outbox intent joins business transactions and consumers deduplicate at-least-once delivery. Do not implement infrastructure for hypothetical events.

Money uses exact decimal storage with an explicit currency and rounding policy; quantities use product base units. Never compute authoritative money using binary floating-point. Cost accounting initially uses actual FEFO batch costs. Orders preserve snapshots when catalog values change. Transfers conserve stock across locations.

## Portal evidence and version policy

Astro's official [7.0 announcement](https://astro.build/blog/astro-7/) confirms the requested major release. The [content collections reference](https://docs.astro.build/en/reference/modules/astro-content/) documents build-time collections and content schema definitions. The portal design uses local Markdown collections, independent static output, and a future pinned Astro 7 patch version. Plugin/runtime compatibility must be checked when implementing; no packages were installed now. See [portal architecture](docs/README.md).

## Deferred choices

Domain defaults now cover multiple businesses per user, multiple locations, owner/admin/staff/viewer permissions, exact units/costs, line tax/discount snapshots, bounded returns, and no online payments in MVP. Confirm production email, currency/tax jurisdiction, expiry labels, return operations, hosting, runtime/package pins, quality service, and portal renderer before relevant release work. Rule-based recommendations are not AI probabilities.

## Repository and package boundaries

Target root `food-intelligence-platform/` holds `apps/api/` (NestJS), `apps/web/` (Next.js), `apps/docs/` (Astro 7), `packages/shared/` (safe contracts), `docker/`, and `.github/`. No structure is created in this correction. NestJS must not import legacy `index.js`. Frontends/shared packages must not import repositories or credentials. Package/lockfile and local/GitHub rename remain pending per [README](README.md).
