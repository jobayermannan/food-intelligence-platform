---
title: Security migration blockers
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 19
---

# Security migration blockers

## Legacy blockers

[Audit SEC-01–SEC-07](../../../../BACKEND_AUDIT.md) records insecure JWT issuance, public admin routes, arbitrary roles, cart ownership defects, token/header logging, credential-like template values, and missing auth enforcement. Source remains unchanged as reference; never carry those behaviors into the new product.

## Target MVP

[PRODUCT_DOMAIN.md](../../../../PRODUCT_DOMAIN.md) defines verified local registration/login, Argon2id, hashed purpose-bound action tokens, rotating refresh families, active-session checks, logout/revocation, and business/location permissions. No role choice at registration. Last-owner protection, safe origin/CSRF handling, rate limiting, redacted logs and cross-tenant negative tests are required.

Address legacy exposed material before reusing credentials/data or routing traffic. No production secrets/exports belong in docs. Deferred payment/webhook security applies only when that integration is approved.
