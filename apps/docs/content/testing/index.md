---
title: Verification plan
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 17
---

# testing

Jest/Supertest integration tests in `apps/api/test` exercise a real isolated PostgreSQL database. CI runs migration, lint, typecheck, tests, build and high-severity production dependency audit. Additional concurrency, DST, restore and Docker-runtime validation should precede production deployment. See [README](../../../../README.md).
