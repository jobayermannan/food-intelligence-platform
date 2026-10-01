---
title: Verification plan
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 17
---

# Verification plan

## Current legacy reference

No executable tests exist; `npm test` is a deliberate error placeholder. Documentation checks are not application tests.

## Target MVP

Jest/Supertest plus real PostgreSQL tests cover password/session lifecycle, replay/revocation, last-owner protection, role/location grants, cross-tenant data access, concurrent FEFO/returns, transfer conservation, exact tax/discount/reversal totals, waste origin, idempotency, and rollback. No mocked success substitutes for transactional/isolation evidence.

Release gates include types, lint, unit/integration/API tests, migrations/restore, Docker startup, secret/dependency scans, quality gate and OpenAPI validation. Deferred Stripe/queue/socket tests enter only with those features. Docs checks validate status, links, tables, diagrams and later Astro build. See [domain](../../../PRODUCT_DOMAIN.md) and [upgrade policy](../../../UPGRADE_GUIDE.md).
