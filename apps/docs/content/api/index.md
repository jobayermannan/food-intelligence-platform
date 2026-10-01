---
title: API contracts
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 6
---

# api

The implemented REST API uses `/api/v1`; Swagger UI is `/api/docs`. DTOs validate requests, global auth checks a live session and services verify tenant/role/location scope. See [API flow](../../../../API_USER_FLOW.md) and [user manual](../../../../USER_MANUAL.md).
