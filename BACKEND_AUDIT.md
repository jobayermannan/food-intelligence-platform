# Backend audit

Audit date: 2026-09-30. Status: **CURRENT SYSTEM**, inspected source only. Phase 0 changes documentation only. No live database, production configuration, or deployed clients were inspected. This audit is a historical snapshot of the legacy prototype; Backend 2.0 is now implemented separately in `apps/api`.

Architectural correction (2026-10-01): this audit describes **Legacy Prototype / Reference**, not a meaningful food-business logic foundation. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) now defines Food Intelligence Platform independently. Legacy data and source remain intact, but compatibility/import is conditional, not an MVP obligation. Original README findings below are historical; README has since been replaced with product identity and rename guidance. Runtime/package/environment findings remain unchanged.

## Evidence and scope

Inspected `package.json`, `package-lock.json`, `index.js`, `README.md`, `.env.example`, `.gitIgnore`, `vite.config.js`, tracked files, and Git status. No repository `AGENTS.md` was found. The initial working tree was clean. No credentials were used, no server was started, and no database was queried.

## 1. Existing stack

JavaScript ES modules; Express `^4.21.0`; MongoDB native driver `^6.9.0`; jsonwebtoken `^9.0.2`; cors `^2.8.5`; dotenv `^16.4.5`; nodemon `^3.1.7`. These are manifest ranges, not a statement about deployed versions. There is no TypeScript, NestJS, PostgreSQL, Drizzle, TypeORM, Redis, BullMQ, Socket.IO, Stripe, or OpenAPI configuration. `vite.config.js` imports Vite and a React plugin absent from the manifest; no frontend source is present. Next.js is the intended main frontend, not an implementation found here.

## 2. Existing architecture

`index.js` owns startup, global middleware, route handlers, token/admin middleware definitions, MongoDB collection handles, and all business logic. No controller/service/repository/module layers exist. `run()` connects to MongoDB and registers most routes; `app.listen()` runs outside that asynchronous initialization. Failed connection can leave an HTTP listener serving only the root route. Graceful shutdown and readiness checks are absent.

## 3. Request flow

Express CORS and JSON parsing → inline route handler → direct MongoDB operation → JSON/text response. Token/admin middleware is defined but attached to no route. `/` is registered outside database initialization. See [current and target diagrams](apps/docs/content/architecture/diagrams.md).

## 4. Existing modules

There are no NestJS modules. Logical groups in `index.js` are token issuance, users/admin lookup, menu reads, review reads, and carts. The future ownership mapping is in [CODEBASE_MAP.md](CODEBASE_MAP.md).

## 5. Existing database/schema

The application selects MongoDB database `BistroDB` and collections `users`, `menu`, `reviews`, `carts`. User code explicitly relies on `_id`, `email`, `role`; cart filtering uses `email`. User/cart creation otherwise stores request bodies without an allowlist. Menu/review fields and cart product references are unknown. No validators, indexes, migration scripts, transactions, or referential checks are declared in source; database-side configuration is unverified. There is no basis for inferring actual quantities, costs, ownership, timestamps, or sales history.

## 6. Existing APIs

All routes are unversioned. None enforces authentication.

| Method and route | Observed behavior |
| --- | --- |
| GET `/` | Static text, not dependency readiness |
| POST `/jwt` | Finds/creates user by supplied email and signs a one-hour token without identity proof |
| GET `/protected` | Returns success without verifying a token |
| GET `/menu` | Lists entire menu collection |
| GET `/reviews` | Lists entire reviews collection |
| GET `/users` | Logs request headers and lists all users |
| POST `/users` | Checks email existence, then inserts arbitrary body; check is not atomic |
| GET `/users/admin/:email` | Reads `req.user.email` even though authentication middleware is absent |
| PATCH `/users/admin/:id` | Promotes supplied ObjectId to admin without authorization |
| DELETE `/users/:id` | Deletes user by supplied ObjectId without authorization |
| GET `/carts` | Filters by caller-supplied email, not authenticated ownership |
| POST `/carts` | Inserts arbitrary body |
| DELETE `/carts/:id` | Deletes supplied ObjectId without ownership check |

## 7. Existing authentication

JWT payload contains userId/email, using `ACCESS_TOKEN_SECRET`. There is no password verification, trusted identity-provider verification, session store, refresh rotation, revocation, or rate limiting. `verifyToken` logs tokens/decoded claims if invoked, but currently is unused. `verifyAdmin` trusts a user's stored role and is also unused. Browser/client authentication cannot be inferred from this repository.

## 8. Existing business logic

Email-based find-or-create, simple duplicate-user lookup, role promotion, and direct cart CRUD are the only material mutations. Menu/reviews are read-only in this server. Cart entries are not orders or evidence of a sale. No stock, batch, expiry, payment, waste, or analytical calculations exist.

## 9. Existing tests

No test files or test framework configuration found. `npm test` is an intentional error placeholder. No tests were run during this documentation phase. There is no current coverage or correctness evidence.

## 10. Existing deployment

No Dockerfile, Compose, GitHub Actions, quality scanner, health/readiness configuration, or deployment runbook found. Environment is loaded via dotenv; port defaults to 5000. README is incomplete at the startup section. `.gitIgnore` excludes `.env` and node_modules, but this does not protect values already committed in `.env.example`.

## 11. Technical debt

Monolithic file, inconsistent responses/errors, no validated DTOs, no dependency injection, stale frontend configuration, no start script, incomplete environment template and documentation. Most asynchronous routes lack error forwarding; malformed ObjectIds and failed database calls have no consistent response path. Admin lookup can dereference undefined `req.user`; its not-found branch lacks a return before another response.

## 12. Security risks — migration/release blockers

| ID | Finding | Required release evidence |
| --- | --- | --- |
| SEC-01 | Insecure JWT issuance permits identity impersonation | Tokens require verified identity; spoofed email login rejected |
| SEC-02 | Unprotected admin routes/user deletion | Authentication plus business-scoped role authorization tested |
| SEC-03 | Arbitrary role assignment through user body and promotion route | Server-controlled role allowlist and audited grants; legacy roles reviewed |
| SEC-04 | Cart ownership controlled by email/ID input | Ownership comes from session; cross-user/business access denied |
| SEC-05 | Request headers logged; token logging present in unused middleware | Redaction tests and sensitive-log review |
| SEC-06 | Credential-like values committed in environment example | Owner verifies exposure, rotates/revokes affected secrets, sanitizes template and assesses history/logs |
| SEC-07 | Missing authentication enforcement, including `/protected` | Route-by-route public/private policy and negative authorization tests |

No secret values are reproduced here. Whether those values are active is unknown. Do not preserve insecure behavior for compatibility. Missing input validation permits unexpected values/operator-shaped inputs; permissive CORS and absent rate limits compound exposure. The separate Backend 2.0 API addresses these patterns with new authentication and authorization; the legacy prototype remains unsafe and must not be exposed.

## 13. Performance risks

Unbounded list reads, no code-defined indexes, repeated user lookups, and no pagination or query budgets. No load measurements exist. Do not claim observed production latency or an N+1 issue without measurement.

## 14. Migration risks

Unknown fields, duplicate/invalid emails and roles, missing owner/product links, ObjectId compatibility, unverified identities, absent historical stock/sales/costs, and unknown deployed clients. See [MIGRATION_PLAN.md](MIGRATION_PLAN.md). Never fabricate history or import ambiguous ownership automatically.

## 15. Reusable functionality

Users, menu/products, carts, reviews, and authentication are conceptual reference points only. They may inform requirements if the new product needs them. No legacy response-shape compatibility or architectural preservation is required by default. Characterize a contract only for a demonstrated real client need; do not copy unsafe identity issuance or unchecked mutations.

## 16. Functionality to refactor

Design the new domain/module boundaries independently rather than refactoring prototype internals into a foundation. New auth, tenancy, stock, sales, waste, expiry, and analytics rules come from the product domain. Retain old code as reference without importing it. If real data must move, use the conditional rehearsal/reconciliation plan; otherwise no MongoDB adoption is required.

## 17. Missing Backend 2.0 capabilities

The legacy prototype lacks these features. The separate Backend 2.0 API now implements business scope, relational schema/migrations, stock/FEFO, movements, sales/returns, waste, expiry, rules-based discounts, analytics, OpenAPI, Docker definitions, CI and tests. Forecasting, outbox, jobs, sockets and payments remain deferred.
