---
title: Analytics definitions
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 15
---

# Analytics definitions

Report only authorized business/location facts. Include on-hand versus saleable stock, low stock, batch-cost value, movements, completed sales by period, top/slow products, waste by product/category/time, expiry risk, gross/discount/net/tax amounts, and separate return-period reversals. Label units, currency, timezone, coverage, and denominator.

MVP stock-waste percentage uses STOCK-origin waste divided by completed gross sold quantity plus STOCK-origin waste for the same unit/product/period. Zero denominator gives null. Customer-return disposal is separate; do not double-count cost already recognized on sale. Revenue after returns subtracts net-before-tax reversals; payment collection is not reported.

Aggregate before joining allocations to avoid duplicated revenue. [Schema](../../../DATABASE_DESIGN.md) and [domain](../../../PRODUCT_DOMAIN.md) define semantics; no forecasting/aggregation tables are required now.
