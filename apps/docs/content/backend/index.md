---
title: Backend boundaries
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 4
---

# backend

The implemented NestJS modular monolith is in `apps/api/src`: auth, business, catalog, inventory, sales, waste and insights. Global JWT/session guard and AccessService enforce current tenant/location scope. PostgreSQL transactions commit stock, movements, allocations and returns atomically. See [codebase map](../../../../CODEBASE_MAP.md).
