# Food Intelligence Platform — user manual

Status: **CURRENT SYSTEM is a Legacy Prototype / Reference. TARGET BACKEND 2.0 is independently designed, not a runnable upgrade. FUTURE ML/AI SERVICES do not exist here.** Target name is `food-intelligence-platform`; local/GitHub/package rename is pending as recorded in [README](README.md). No application frontend exists here.

## What the system does

Today the server lists menu items and reviews, creates/lists/deletes users, changes a user's admin role, and stores shopping-cart entries. It has serious access-control problems described in the [audit](BACKEND_AUDIT.md). Do not expose this version to untrusted users.

Food Intelligence Platform will let multiple food businesses track locations, suppliers, products, batches, sales, returns, waste, and expiry while keeping each business's data separate. Initial discount suggestions use explainable rules. Forecasting and advanced AI are later features, not implemented intelligence. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) explains the independent business model; legacy CRUD does not supply its rules.

## Who can do what

A person can join more than one business, and a business can have more than one location. Owners control the business and access; admins manage operations and staff/viewer grants. Staff receive stock and record sales/waste at assigned locations. Viewers read inventory and analytics at assigned locations. Staff/viewers with no location grant cannot access that location's operations. A business admin does not become an admin of another business.

The working login design is verified email/password with securely hashed passwords, short-lived access tokens, and rotating revocable sessions. Registration never lets someone choose an admin role. Logout revokes the session; changing roles takes effect on subsequent requests. The old email-only `/jwt` behavior is not reused.

## How to start the current server for isolated development

These instructions describe existing entry points; they were not executed in Phase 0. Use a disposable local/test MongoDB database, not production. Install a compatible Node.js/npm release after dependency review, run `npm ci` in the repository, and create a private `.env` with `MONGODB_URI`, `PORT` (defaults to 5000), and a newly generated `ACCESS_TOKEN_SECRET`. Do not copy the credential-like values from the current example file. Run `node index.js`; stop with Ctrl+C.

The server explicitly selects database `BistroDB`. The MongoDB URI determines the server location; it is not known from this repository. GET `/` only returns text and does not prove database readiness. Most routes register after the connection succeeds. There is no usable test suite or Docker startup command yet. `npm test` currently reports that no test is specified.

## Where things live and what changing them means

All future paths in this table are proposals. [Codebase map](CODEBASE_MAP.md) provides details.

| Technology | What it is / why we use it | Current or proposed location | What can break / safe replacement |
| --- | --- | --- | --- |
| Express + MongoDB | Legacy CRUD reference only | `index.js`; source database location from private URI | Leave source/data intact. Import only if an actual requirement is approved; do not port its architecture |
| TypeScript | JavaScript with checked contracts | Proposed `apps/api/src/`, app TypeScript configuration | Build/type contracts; test new domain contracts |
| NestJS | Organizes independently designed backend modules | Proposed `apps/api/src/main.ts`, `apps/api/src/modules/` | HTTP, guards, startup; verify module contracts without importing legacy code |
| PostgreSQL | Durable relational data store | Proposed separate database service, not inside NestJS | Loss affects inventory/history. Back up, rehearse restore and migrations before changes |
| Drizzle + pg | Schema/query layer and PostgreSQL driver | Proposed `apps/api/src/database/`, `apps/api/drizzle/` | Constraints/transactions; one migration authority, empty/upgrade tests |
| Validation | Rejects malformed or unexpected input | Proposed DTOs using class-validator/class-transformer | Invalid data or rejected clients; contract tests before altering rules |
| Authentication | Proves identity and enforces scoped permissions | Proposed Auth/Access in `apps/api/` | Account takeover/lockout; verify registration, password/session recovery, tenant/location checks |
| Redis | Future jobs/cache infrastructure, not MVP | Deferred separate service | Queue/cache failures; PostgreSQL remains authoritative |
| BullMQ | Future background processing when necessary | Deferred API workers | Missed/duplicate work; idempotency and recovery tests before adoption |
| Socket.IO | Optional future live notices | Deferred API gateway | Data leakage/staleness; authorized rooms and REST refresh |
| Payments | Optional future Stripe Test adapter for order payments | Deferred API payments module | Provider/idempotency tests; no live charges or platform billing in MVP |
| Forecast adapter | Future baseline/model boundary | Deferred API forecasting module | Coverage/evaluation needed; no invented history |
| Next.js | Main application frontend | Future `apps/web/` | User workflows/contracts; do not substitute Astro |
| Astro 7 | Documentation portal only | Current `docs/`; future `apps/docs/` after reviewed move | Links/build may break on relocation; no business logic/database access |
| Docker/Compose | Packages software and starts services | Future `docker/`; project name `food-intelligence-platform` | Startup/volumes; do not rename data volumes for branding |
| GitHub Actions/quality gate | Automated checks on changes | Proposed `.github/workflows/` and scanner configuration | Unverified releases; keep required checks enforced during replacement |

## How Docker will work here

After approved implementation, MVP Compose will start API and PostgreSQL on a development network, plus a development mail sink if local registration needs it. Workers/Redis are later additions only when required. PostgreSQL uses persistent storage; NestJS connects over its service address. Astro builds separately in `apps/docs/`. No Compose file exists today. Never delete or rename a data volume to fix startup or branding.

## Where to change a feature

Today: only prototype CRUD/API handling is in `index.js`, not meaningful food-domain logic. Later: `apps/api/` controllers own routes, services own domain rules, repositories/Drizzle own queries. Unit tests live beside modules, HTTP/integration tests in `apps/api/test/`. Future workers/gateways/adapters appear only when needed. `packages/shared/` contains safe public contracts, not database code. See [change-impact map](CHANGE_IMPACT_MAP.md).

## Practical future workflows

Create business → establish owner/members and location grants → define products/suppliers. Receive food with unit, quantity, cost, and expiry → ledger records it. Sell at one location → server calculates tax/discount snapshots and allocates FEFO stock. No online payment is required. Record waste → quantity and cost are saved with the batch. Returned goods only restock after inspection; refund records alone never add stock. Expiry queries show warnings without discarding food. An admin/owner approves a suggested discount.

MVP supports piece/kg/gram/litre/ml/package with explicit base units; no negative stock. Restaurant and retail sales share a simple recorded-order model, without kitchen/recipe/table workflows. Carts, reviews, live payments, platform subscriptions, forecasting, and advanced AI are future scope unless approved.

[API flows](API_USER_FLOW.md) and [visual map](docs/content/architecture/diagrams.md) show each path. To upgrade, follow the [upgrade guide](UPGRADE_GUIDE.md); documentation approval does not authorize a production rollout.
