---
title: Payment adapter
status: future
owner: Backend architecture
last_reviewed: 2026-10-01
order: 12
---

# Payment adapter

**Deferred; not required for Backend 2.0 MVP.** Sales and return amounts are operational records, not gateway receipts. Stripe, if later approved, starts in Test Mode for restaurant/retail order processing. Platform subscription billing is a separate undefined product, not an assumed payment use case.

A future PaymentService uses provider-neutral commands/status, server-calculated order amounts, persisted idempotency, raw-body webhook signature verification, deduplication, and explicit compensation. No raw cards. Provider capability differences must be documented before changing gateways.

[Domain](../../../../PRODUCT_DOMAIN.md) owns scope; [payment diagram](../architecture/diagrams.md) is labeled deferred. Do not create payment tables, credentials, SDK packages, or endpoints during MVP foundation work without a real approved requirement.
