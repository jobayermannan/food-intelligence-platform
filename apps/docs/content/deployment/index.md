---
title: Deployment and CI/CD plan
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 18
---

# deployment

`docker-compose.yml` defines API, PostgreSQL and Mailpit for local development. `docker/api.Dockerfile` builds the API and `.github/workflows/api.yml` defines CI checks. Production hosting, backup/restore rehearsal, mail provider, shared limiter and release operations are not complete. See [upgrade guide](../../../../UPGRADE_GUIDE.md).
