---
title: API contracts
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 6
---

# API contracts

## Current legacy reference

[Audit](../../../BACKEND_AUDIT.md) lists unversioned prototype routes. Their internal architecture and insecure behavior are not target contracts.

## Target MVP

[API_USER_FLOW.md](../../../API_USER_FLOW.md) owns planned registration/login/session, business/membership/location, catalog, stock, sales/returns, waste, expiry, discount, and analytics flows. Scoped resource routes use `/api/v1/businesses/:businessId/...`. Every referenced business/location/resource is verified; pagination and errors avoid data leakage.

No legacy aliases are planned, especially no `/jwt`. OpenAPI will document implemented MVP endpoints only. Payments/forecasting/carts/reviews/realtime remain deferred; do not advertise them as callable.
