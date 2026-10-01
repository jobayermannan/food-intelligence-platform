---
title: Inventory and FEFO
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 7
---

# Inventory and FEFO

One product may have many batches at multiple locations. Each product has a fixed piece/kg/gram/litre/ml/package base unit; count units are integral. Allow only explicit same-dimension conversions. Batch acquisition cost is confirmed receipt cost divided by received base-unit quantity; multi-currency/landed-cost allocation is deferred.

[Domain](../../../../PRODUCT_DOMAIN.md) and [schema](../../../../DATABASE_DESIGN.md) require nonnegative stock, immutable movements, stable locks, FEFO eligibility, and transactional balances. Same-business owner/admin transfers preserve lot/cost/expiry with paired movements; staff operate only assigned locations. Returned goods restock only after inspection into their original batch; financial reversals alone never add stock. No recipe/ingredient depletion or in-transit logistics is assumed.
