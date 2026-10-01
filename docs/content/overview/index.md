---
title: Project overview
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 1
---

# Project overview

## Current legacy reference

Only the Express/MongoDB CRUD prototype is executable. It is **Legacy Prototype / Reference**, not a food-business logic foundation. See [audit](../../../BACKEND_AUDIT.md).

## Target MVP

**Food Intelligence Platform** (`food-intelligence-platform`) independently models businesses, verified users/memberships, locations, products/suppliers, batch inventory, sales/returns, waste, expiry, rule-based discounts, and scoped analytics. [PRODUCT_DOMAIN.md](../../../PRODUCT_DOMAIN.md) owns decisions and assumptions. Local/GitHub/package rename remains pending per [README](../../../README.md).

## Future scope

Forecasting/AI, payments, optional carts/reviews, integrations, queues, and realtime delivery are deferred. Next.js targets `apps/web/`, NestJS `apps/api/`, and documentation-only Astro 7 `apps/docs/`. Current Markdown stays in `docs/` until a reviewed move.
