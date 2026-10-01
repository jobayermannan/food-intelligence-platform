---
title: Maintenance and documentation ownership
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 20
---

# maintenance

Start with [domain](../../../../PRODUCT_DOMAIN.md), [codebase map](../../../../CODEBASE_MAP.md) and actual source. Keep migration SQL, API contracts, tenant isolation and stock ledger invariants under review. Reconcile inventory positions against movements and rehearse database restore before production changes. Deferred services require new runbooks when built.
