---
title: Deployment and CI/CD plan
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 18
---

# Deployment and CI/CD plan

Future target infrastructure is under `docker/` and `.github/` in `food-intelligence-platform`. MVP Compose project name is `food-intelligence-platform`, starting API and PostgreSQL with a development mail sink as needed. Database storage persists; readiness, private networking, least-privilege credentials and graceful shutdown are required. Redis/workers are deferred. Do not rename database volumes as branding.

Next.js `apps/web/` and Astro `apps/docs/` build independently of NestJS `apps/api/`. GitHub Actions gates tests, migrations, builds, security/quality, and API/docs checks before staging/release approval. No files or services exist yet.

[README](../../../README.md) records pending names; [upgrade guide](../../../UPGRADE_GUIDE.md) covers recovery. Legacy data import is conditional, not a deployment prerequisite.
