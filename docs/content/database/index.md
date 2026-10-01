---
title: Relational data design
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 5
---

# Relational data design

[DATABASE_DESIGN.md](../../../DATABASE_DESIGN.md) distinguishes **21 MVP table designs and eight deferred candidates**. Four additions to the original candidate list support authentication action tokens, location grants, and bounded return header/lines; none is implemented. [ER diagrams](../architecture/diagrams.md) show scope separately.

The schema comes from [product domain](../../../PRODUCT_DOMAIN.md), not MongoDB document shapes. Every operational resource belongs to a business, with location-scoped access and composite references. Preserve exact units/money and immutable sale/return/waste/stock history. Future schema/migrations live under `apps/api/`.

[Legacy import](../../../MIGRATION_PLAN.md) is conditional. Without approved real data needs, leave MongoDB untouched and start with verified new accounts and explicit stocktake/receipts.
