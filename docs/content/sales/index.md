---
title: Sales and carts
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 8
---

# Sales and carts

MVP records restaurant or retail food sales at one authorized location per order; it does not implement tables, kitchen workflows, recipes, carts, reservations, or online checkout. Server-side prices, one approved line discount, and tax-exclusive line calculations are snapshotted. FEFO may allocate one line across multiple batches. Commit completed orders, allocations, movements and balances atomically.

Owner/admin returns reference original allocations, cap cumulative quantity/money, and preserve proportional discount/tax reversals with final rounding remainder. Inspected eligible units may restock; disposed returned goods become linked waste without another stock decrement. Financial return records do not process external money. [Domain](../../../PRODUCT_DOMAIN.md), [schema](../../../DATABASE_DESIGN.md), and [flows](../../../API_USER_FLOW.md) define these assumptions.
