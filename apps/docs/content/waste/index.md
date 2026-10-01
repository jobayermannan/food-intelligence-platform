---
title: Food waste
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 9
---

# Food waste

Waste records identify business, location, product, batch, quantity/base unit, immutable cost, reason, time, and responsible actor. Reasons: expired, spoiled, damaged, overproduction, preparation_waste, other; other needs notes. Staff can record stock waste only at assigned locations; owner/admin have business-wide access.

STOCK-origin waste decrements batch and ledger atomically. CUSTOMER_RETURN disposal is tied to an approved return line and does not decrement stock already removed by the original sale. Report these origins separately to avoid duplicate stock/cost loss. Alerts never automatically discard food.

[Domain](../../../../PRODUCT_DOMAIN.md) owns policies; [schema](../../../../DATABASE_DESIGN.md) defines the stock-waste denominator and return provenance.
