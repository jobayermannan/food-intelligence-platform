# Upgrade guide

Status: **planning only**. Target identity is Food Intelligence Platform / `food-intelligence-platform`; actual package/folder/remote rename is pending per [README](README.md). Legacy package version is 1.0.0; Backend 2.0 and later are not released. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) defines the independent MVP and deferred scope.

## Backend 1.0 → 2.0

Build the independent product; do not refactor the prototype as a foundation. Only if real legacy data/client requirements are approved, follow [MIGRATION_PLAN.md](MIGRATION_PLAN.md): retained source → export → transformation → validation → isolated PostgreSQL rehearsal → reconciliation → approved cutover. No default carts/reviews import or route aliases. Security findings must not carry into the new release; legacy JWTs do not authenticate new accounts.

MVP configuration covers PostgreSQL, password/session/email verification, permitted origins, currency/timezone and expiry policies. Redis/Stripe/job settings are required only when those deferred features are approved. Legacy still reads `MONGODB_URI`, `PORT`, and `ACCESS_TOKEN_SECRET`; leave it untouched in this pass. Supply sanitized target templates before implementation/release.

## Future release policy

| Transition | Database | Environment/API | Deprecation/breakage | Recovery |
| --- | --- | --- | --- | --- |
| 2.0 → 2.1 | Prefer additive tables/nullable columns/indexes; rehearse backfills | Optional settings with safe defaults; additive `/api/v1` contracts | Announce deprecation with replacement and sunset criteria | Roll back app only while previous version remains schema-compatible |
| 2.1 → 2.2 | Validate/backfill constraints before tightening; separate costly index work | Validate new required settings before rollout; retain old DTO/event compatibility during transition | Remove nothing merely because it was marked deprecated in a prior minor release | Keep original data; forward-fix transformations that are not safely reversible |
| 2.x → 3.0 | Expand/contract across releases; tested migration from supported 2.x versions | New API major only for justified breaking changes; parallel client transition | Explicit removal list, client owners, dates, and acceptance tests | Document rollback window and write compatibility; no blind reverse migration |

## Required per-release record

Document exact commit/artifact versions, database migration IDs/checksums, tested source versions, configuration additions/removals, API/OpenAPI diff, event/job versions, deprecated features, breaking changes, client action, backup/restore evidence, security/quality results, and known limitations. Update portal and maps in the same change. Never call a future release complete based on this policy table.

## Rollout and rollback gates

Build/type/lint/unit/integration/API tests → clean-database and representative-upgrade migration tests → Docker build/startup → security and quality gates → OpenAPI/docs validation → approved release artifact. Verify readiness and observe payment/job/stock reconciliation after deployment. Define operational recovery time and acceptable data-loss limits before production use.

Quiesce or version incompatible workers before changing job payloads. Drain/version pending outbox events and preserve deduplication keys. Credential rotation can make an old binary unusable; verify recovery configuration. A database restore does not reverse a provider payment. After new writes, use maintenance mode and controlled reconciliation if rollback would lose transactions. Never return traffic to the known-insecure legacy server.

## Documentation portal upgrades

Astro 7 targets `apps/docs/`, separately from Next.js `apps/web/` and NestJS `apps/api/`. Current Markdown remains in `docs/`; moving it requires source/root link and collection-loader base updates. Pin a compatible runtime/renderer on implementation; validate content, links, diagrams, accessibility and build. No business migration is needed for portal updates.
