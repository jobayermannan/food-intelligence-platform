---
title: Upgrade planning
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 22
---

# Upgrade planning

[UPGRADE_GUIDE.md](../../../UPGRADE_GUIDE.md) defines future releases, not completed versions. Build the independent domain from [PRODUCT_DOMAIN.md](../../../PRODUCT_DOMAIN.md); import legacy records only for an approved concrete need. Preserve reference source/data without preserving insecure behavior.

Record migrations, environment changes, API compatibility for actual clients, deprecations, breaking changes, recovery limits and test evidence. Restoring PostgreSQL does not reverse future provider charges. Pending folder/GitHub/package identity steps are in [README](../../../README.md).

Astro's target is `apps/docs/`; current `docs/` has not moved. Repair root/topic links and content-loader bases together, then validate diagrams/build. Documentation changes never require business database access.
