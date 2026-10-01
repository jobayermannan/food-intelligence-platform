---
title: Socket.IO notifications
status: future
owner: Backend architecture
last_reviewed: 2026-10-01
order: 13
---

# Socket.IO notifications

**Deferred.** MVP uses REST for commands, queries, and scoped expiry alert lists. Socket.IO is added only if live notifications provide actual value.

A future gateway sends minimal committed events to server-authorized business/location/user rooms, checks active sessions/membership, and removes revoked access. Clients cannot join arbitrary rooms. Versioned envelopes support duplicate/out-of-order handling, but REST remains the source of truth after gaps/reconnect. No payment/user secrets in payloads.

[Domain](../../../../PRODUCT_DOMAIN.md) defines ownership; [future event map](../../../../CODEBASE_MAP.md) and [diagram](../architecture/diagrams.md) are plans, not installed dependencies.
