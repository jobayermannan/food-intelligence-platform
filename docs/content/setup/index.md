---
title: Local setup
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 3
---

# Local setup

## Current legacy reference

[USER_MANUAL.md](../../../USER_MANUAL.md) describes isolated inspection with `node index.js`, `MONGODB_URI`, `PORT`, and `ACCESS_TOKEN_SECRET`. Do not copy unsafe environment-example values or expose the prototype publicly. The local folder is still `amr-project-server`; [README](../../../README.md) documents the pending local/GitHub/package rename.

## Target MVP

Later setup will pin runtime/dependencies, initialize `apps/api/`, PostgreSQL, development email delivery and tests. No Docker or new app command exists now. Redis/Stripe/queues are not MVP prerequisites. Astro targets `apps/docs/`; reviewed relocation of current `docs/` must repair relative links. No directories or runtime packages are created by this design correction.
