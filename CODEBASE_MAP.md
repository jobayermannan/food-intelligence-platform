# Food Intelligence Platform — codebase map

This map describes the implemented Backend 2.0 MVP. The business model comes from [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md), not from the legacy prototype.

| Area | Files | Responsibility |
| --- | --- | --- |
| HTTP bootstrap | `apps/api/src/main.ts`, `app.module.ts`, `config.ts` | Validation, CORS, Swagger, modules, configuration |
| Authentication | `apps/api/src/auth/`, `common/auth.guard.ts` | Registration, verification, Argon2id login, JWT validation, rotating sessions, recovery |
| Access | `apps/api/src/common/access.service.ts`, `business/` | Active membership, role and location grants; redacted audit trail; business/locations/member endpoints |
| Catalog | `apps/api/src/catalog/` | Categories, products, suppliers and business scope |
| Inventory | `apps/api/src/inventory/` | Receipt, FEFO allocation, transfer, adjustment, batches, balances and movements |
| Sales and returns | `apps/api/src/sales/` | Server-calculated orders, allocations, bounded returns and restock/disposal |
| Waste | `apps/api/src/waste/` | Batch waste, reason, immutable cost and stock movement |
| Intelligence | `apps/api/src/insights/` | Expiry, rules-based discount recommendation/approval and scoped analytics |
| Database | `apps/api/src/database/schema.ts`, `migrate.ts`, `apps/api/drizzle/` | PostgreSQL schema, composite business keys, migrations, role seed |
| Integration tests | `apps/api/test/` | Real PostgreSQL HTTP/security/domain checks |
| Infrastructure | `docker-compose.yml`, `docker/api.Dockerfile`, `.github/workflows/api.yml` | Local stack and CI quality gate |
| Legacy reference | `legacy/index.js`, `legacy/package.json` | Original Express/MongoDB prototype, not imported |
| Documentation | `apps/docs/content/` plus root Markdown | Authored content; no Astro runtime/business logic |

The API is a modular monolith. Controllers validate DTOs, global auth verifies the current session, AccessService checks current business membership and location grants, and services use Drizzle transactions. InventoryService owns standard stock changes; SalesService handles sale allocations/returns in the same transaction and WasteService records batch waste. Analytics and recommendations read committed operational data and never mutate stock. No frontend, Redis, BullMQ, Socket.IO, payment, ML, cart or review module exists in the MVP.

Legacy → Backend 2.0 mapping is conceptual: `users` → `users` plus `business_memberships`; `menu` → `products` plus `categories`; `carts` → deferred `carts`/`cart_items`; `reviews` → deferred `reviews`; legacy JWT → entirely new authentication/session system. No live MongoDB data was imported.

Mermaid diagrams for intended and future flows remain in [apps/docs/content/architecture/diagrams.md](apps/docs/content/architecture/diagrams.md). Interpret future queues, payments, realtime and ML as proposals, not implemented modules.
