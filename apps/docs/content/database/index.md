---
title: Relational data design
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 5
---

# database

The implemented PostgreSQL/Drizzle schema has 22 MVP tables in `apps/api/src/database/schema.ts`; migrations are in `apps/api/drizzle`. Business IDs and composite foreign keys reinforce isolation; API authorization still checks membership and grants. Carts, reviews, payments, forecast and outbox tables are deferred. See [database design](../../../../DATABASE_DESIGN.md).
