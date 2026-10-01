# Food Intelligence Platform — API user flows

Status: **TARGET BACKEND 2.0 design only**. No endpoints below exist yet. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) owns the independent domain and MVP assumptions; [audit](BACKEND_AUDIT.md) lists actual legacy routes. The prototype is not the new API foundation. No legacy aliases or compatibility adapters are scheduled.

## Request boundary

Proposed prefix `/api/v1`. Authentication verifies identity and active session; access policy checks active business membership, role, and location grants. Validation uses allowlisted DTOs; services check all referenced resource ownership; repositories require explicit business/location scope. Global account routes do not expose a global user directory. Business creation requires a verified user but no pre-existing membership.

Invalid identity returns 401; forbidden actions return 403; inaccessible resource IDs use a consistent 404 policy to avoid cross-business enumeration. Invalid DTOs return 400; stock/state/idempotency conflicts return 409. Never return raw credentials, stack traces, or private user fields. Mutation keys bind actor, business, operation, and normalized request hash; different payload under an existing key is a conflict.

MVP REST responses follow committed database state. No outbox, BullMQ, Socket.IO, Stripe, or forecasts are required for these flows. Optional future events never duplicate domain logic. Controllers/services below live under proposed `apps/api/src/modules/` and are not implemented.

## Authentication lifecycle

| Action / proposed request | Controller and service | Validation, persistence, response |
| --- | --- | --- |
| POST `/api/v1/auth/register` | AuthController → AuthService | Email/password DTO, rate limits; Argon2id hash and unverified users record; hashed verification token; generic 202 without account enumeration |
| POST `/api/v1/auth/verify-email` | AuthController → AuthService | Valid purpose/expiry/unconsumed token; transaction consumes token and verifies user → 204 |
| POST `/api/v1/auth/login` | AuthController → AuthService | Credential/account verification; hashed rotating refresh session → access token plus secure refresh cookie; generic failure |
| POST `/api/v1/auth/refresh` | AuthController → AuthService | Cookie/origin/CSRF checks, token family state; atomic rotation and replay revocation → new access token/cookie |
| POST `/api/v1/auth/logout` | AuthController → AuthService | Session family revocation and cookie clearing → 204; protected access checks session state |
| POST `/api/v1/auth/logout-all` | AuthController → AuthService | Verified user revokes all own sessions → 204 |
| POST `/api/v1/auth/forgot-password` | AuthController → AuthService | Rate-limited generic response; hashed single-use reset token delivered only to verified address → 202 |
| POST `/api/v1/auth/reset-password` | AuthController → AuthService | Purpose/expiry/consumption validation, hash new password, revoke all sessions → 204 |
| GET `/api/v1/auth/me` | AuthController → AuthService | Active session/user → safe own profile and memberships, not global user list |

Actual production email delivery is a release prerequisite; isolated development uses a mail sink. The token values never enter logs. Session/token durations and fresh access checks are defined in PRODUCT_DOMAIN.md. No `/jwt` endpoint is carried forward.

## Business and catalog flows

| Action / proposed request | Controller → service | Database and result |
| --- | --- | --- |
| POST `/api/v1/businesses` | BusinessesController → BusinessesService | Verified principal, timezone/currency/tax setup DTO and idempotency; transaction creates business and owner membership → 201 |
| POST `/api/v1/businesses/:businessId/members` | AccessController → AccessService | Authorized grantor, verified existing user ID, allowed role; create membership → 201; no public email lookup or arbitrary admin grant |
| PATCH/DELETE `/api/v1/businesses/:businessId/members/:memberId` | AccessController → AccessService | Owner/admin permission matrix and last-owner invariant; change/revoke membership → 200/204; history retained |
| PUT `/api/v1/businesses/:businessId/members/:memberId/locations` | AccessController → AccessService | Authorized role and same-business locations; atomic membership_locations replacement → 200; staff/viewer with empty grants has no location access |
| POST `/api/v1/businesses/:businessId/locations` | LocationsController → LocationsService | Owner/admin, unique business code → inventory_locations → 201 |
| POST `/api/v1/businesses/:businessId/products` | CatalogController → CatalogService | Owner/admin; fixed base unit, price, same-business category → products → 201 |
| POST `/api/v1/businesses/:businessId/categories` | CatalogController → CatalogService | Owner/admin and validated name → categories → 201 |
| POST `/api/v1/businesses/:businessId/suppliers` | CatalogController → CatalogService | Owner/admin and validated reference fields → suppliers → 201 |

Corresponding scoped GET routes return paginated authorized data. Catalog/supplier responses expose only required reference data; operational quantity/cost data comes from location-scoped endpoints. Public catalog/reviews and anonymous carts are not MVP contracts.

## Inventory, sales, waste, and intelligence flows

All paths below include `/api/v1/businesses/:businessId`. Location IDs are validated against business ownership and actor access, never merely trusted from a DTO.

| Action / route suffix | Controller → validation/service | Atomic persistence or query → response |
| --- | --- | --- |
| POST `/inventory/purchases` | InventoryController → quantity/unit/cost/expiry/location DTO → InventoryService | Lock inventory, create/receive batch, positive PURCHASE movement and balance update → 201 receipt |
| POST `/inventory/transfers` | InventoryController → owner/admin, source/destination and quantity → InventoryService | Same-business locations, stable locks, conserved paired TRANSFER movements, retained lot/cost/expiry → 201 transfer reference |
| POST `/inventory/adjustments` | InventoryController → owner/admin, reason and signed quantity → InventoryService | Nonnegative final balance, audited ADJUSTMENT and projection → 201 |
| POST `/orders` | SalesController → authorized staff/admin/owner, one location, item quantities → SalesService and InventoryService | Server price/one approved discount/tax snapshots; FEFO batch locks; completed order/items/allocations/negative SALE movements/balances commit together → 201; shortage rolls back with 409 |
| POST `/orders/:orderId/returns` | SalesController → owner/admin, original allocations, quantity/reason/disposition → SalesService and InventoryService | Lock original allocations, cap cumulative returned quantity/money; immutable return rows; inspected eligible stock gets RETURN movements; discarded returned goods get linked waste without second stock decrement → 201 recorded return |
| POST `/waste` | WasteController → assigned location/batch/positive quantity/reason → WasteService and InventoryService | STOCK-origin waste/cost snapshot/negative WASTE movement/balances → 201; returned-goods disposal is recorded through return workflow |
| GET `/inventory/expiry` | InventoryController → scope/as-of/window/page → ExpiryService | Positive scoped batches; expired/critical/warning/safe/unknown/nonperishable classification → 200; no mutation/disposal |
| POST `/discount-recommendations` | DiscountsController → owner/admin/viewer query scope → rule-based recommendation policy | Read stock, expiry, reliable velocity/cost; return proposal, excess, version, reasons → 200; no automatic persisted discount or stock mutation |
| POST `/discounts` | DiscountsController → owner/admin approval DTO → DiscountsService | Revalidate policy and store approved product/batch percent/window → 201; no client price trust at sale time |
| GET `/analytics/inventory` | AnalyticsController → permission/location/window limits → AnalyticsService | Scoped on-hand/saleable/low-stock/value/movements → 200 with unit/currency/coverage |
| GET `/analytics/sales` | AnalyticsController → authorized location/time/granularity → AnalyticsService | Completed sales, top/slow products, separate return-period reversals → 200 |
| GET `/analytics/waste` | AnalyticsController → authorized scope/time → AnalyticsService | Stock waste and customer-return disposal separated, quantity/cost/product/category/trend → 200 |
| GET `/analytics/expiry` | AnalyticsController → authorized scope/as-of → AnalyticsService | Warning categories and at-risk batch value → 200 |
| GET `/analytics/revenue` | AnalyticsController → authorized scope/time → AnalyticsService | Gross, discounts, net-before-tax, tax, bounded return reversals, separately labeled waste cost → 200; no payment receipt claim |

## Legacy → Backend 2.0 Mapping

| Legacy | Target concept | Compatibility obligation |
| --- | --- | --- |
| users | users + business_memberships | None by default; new verified identity and permissions |
| menu | products + categories | None; independent product/unit/catalog model |
| carts | carts + cart_items | Deferred until a real product need |
| reviews | reviews | Deferred until a real product need |
| JWT | new authentication/session system | Old issuance/tokens explicitly rejected |

A conceptual mapping is not a route mapping. Only a named client requirement can justify a future bounded adapter. Do not spend MVP effort matching MongoDB response documents or prototype internals.

## Deferred flow contracts

- **Payments:** future PaymentService → provider-neutral adapter → Stripe Test Mode, signed/deduplicated webhooks and compensation. No gateway is required to record MVP sales/returns; no platform subscription billing is defined.
- **Forecasting:** future authorized request → scoped, versioned run → optional worker/model adapter → predictions. No fabricated history or autonomous stock change.
- **Jobs/outbox:** when needed, persist durable intent with business transactions, enqueue idempotently, and reconcile failed delivery.
- **Socket.IO:** when needed, send minimal committed notifications only to freshly authorized business/location rooms. Clients refresh REST on gaps/reconnect.

[Architecture diagrams](docs/content/architecture/diagrams.md) label these as deferred. OpenAPI must later describe implemented routes, not every future idea in this document.
