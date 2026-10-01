---
title: Architecture
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 2
---

# Architecture

## Current legacy reference

One Express file handles CRUD against four MongoDB collections; it contains no reusable food-domain architecture. Authentication middleware is unused.

## Target MVP and future

[Domain](../../../PRODUCT_DOMAIN.md) defines tenants/location access and independent business rules. [Diagrams](diagrams.md) separate MVP from deferred jobs/sockets/payments/ML; [map](../../../CODEBASE_MAP.md) identifies proposed file owners. Inventory owns stock mutations through shared transactions; Sales/Returns and Waste invoke it. Analytics are location-scoped reads.

Target roots are `apps/api/`, `apps/web/`, `apps/docs/`, `packages/shared/`, and `docker/`. Current content was not moved. Optional legacy compatibility is not an architectural layer until a real requirement exists.
