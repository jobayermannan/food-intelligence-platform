---
title: Backend boundaries
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 4
---

# Backend boundaries

Food Intelligence Platform's independent backend belongs in `apps/api/` using NestJS/TypeScript and PostgreSQL/Drizzle. It does not import or reproduce legacy `index.js` architecture. Controllers translate validated DTOs, access policies enforce fresh session/business/location permissions, services own domain rules, and repositories require explicit scope.

[PRODUCT_DOMAIN.md](../../../PRODUCT_DOMAIN.md) defines MVP ownership and assumptions; [CODEBASE_MAP.md](../../../CODEBASE_MAP.md) names proposed files; [API flows](../../../API_USER_FLOW.md) are unimplemented contracts. Deferred module candidates are not instructions to scaffold them. Readiness, graceful shutdown, bounded queries, redacted logs, and security tests belong in the foundation.
