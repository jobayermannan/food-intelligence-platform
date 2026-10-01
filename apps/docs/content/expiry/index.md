---
title: Expiry policy
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 10
---

# Expiry policy

Expiry is per batch. Proposed business defaults: critical within 24 hours, warning within 72 hours; enforce 0 < critical < warning. Already expired, safe, unknown, and explicitly nonperishable are separate. Date-only labels map to next local-day start as exclusive expiry, pending confirmation of actual label meaning.

MVP uses bounded indexed request-time queries, not a BullMQ dependency. API alert lists are scoped to locations accessible to owner/admin/staff. Future notification delivery may reuse this policy; no automatic disposal or unauthorized cross-location notice.

Expired/unknown-expiry perishable stock is not FEFO-saleable. [Domain](../../../../PRODUCT_DOMAIN.md), [discounts](../discounts/index.md), and [flows](../../../../API_USER_FLOW.md) share these central rules.
