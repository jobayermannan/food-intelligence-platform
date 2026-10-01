---
title: BullMQ jobs and outbox
status: future
owner: Backend architecture
last_reviewed: 2026-10-01
order: 14
---

# BullMQ jobs and outbox

**Deferred.** MVP expiry/analytics use indexed request-time queries and require neither BullMQ/Redis nor an outbox. Add asynchronous infrastructure only for a demonstrated workload; scheduling/session cleanup operations will be specified with the relevant implementation.

Future durable outbox intent joins the business transaction; relay/worker delivery is at least once with stable tenant-scoped operation keys. Jobs carry explicit business/location context and revalidate requester access before releasing reports. Add bounded retries, jitter/backoff, failure retention, queue/outbox-age metrics, and operator recovery.

Possible future jobs include expiry-scan, forecast-generation, inventory-reconcile, payment-reconcile, and report-generation; do not scaffold all now. See [scope](../../../PRODUCT_DOMAIN.md), [ownership](../../../CODEBASE_MAP.md), and [diagram](../architecture/diagrams.md).
