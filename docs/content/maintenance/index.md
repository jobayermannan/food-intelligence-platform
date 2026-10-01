---
title: Maintenance and documentation ownership
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 20
---

# Maintenance and documentation ownership

Read [PRODUCT_DOMAIN.md](../../../PRODUCT_DOMAIN.md), [change impact](../../../CHANGE_IMPACT_MAP.md), [codebase map](../../../CODEBASE_MAP.md), then actual files. The legacy prototype is not a source of new business rules. Proposed paths and deferred tables are not implemented modules.

Every API/schema/rule/permission/event/job change updates canonical docs, maps, relevant diagrams and tests in the same change. Root documents remain single-source. Current `docs/` moves to `apps/docs/` only with link/loader updates; no duplicate editable trees.

MVP runbooks need tenant-aware stock/return reconciliation, session recovery/revocation, backup restore and incident ownership. Future jobs/payments add their own replay/reconciliation procedures. Identity rename must preserve working files and data; [README](../../../README.md) records exact pending surfaces.
