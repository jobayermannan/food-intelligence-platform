# Food Intelligence Platform — codebase map

Status: current paths describe **Legacy Prototype / Reference** only. Target repository is `food-intelligence-platform`. All target code lives beneath future `apps/api/`, `apps/web/`, `apps/docs/`, `packages/shared/`, or `docker/`; no target directories are created now. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) defines the business independently. Proposed paths are not existing files.

## Current implementation

| Feature | Real file | Flow / collection |
| --- | --- | --- |
| Startup/config/middleware | `index.js` | dotenv, Express, CORS, MongoClient, listener |
| Identity/users/admin | `index.js` | inline routes → `users`; token/admin middleware unused |
| Menu | `index.js` | GET `/menu` → `menu` |
| Reviews | `index.js` | GET `/reviews` → `reviews` |
| Carts | `index.js` | cart routes → `carts` |
| Dependencies | `package.json`, `package-lock.json` | Express/MongoDB packages; failing test placeholder |
| Setup/reference | `README.md`, `.env.example`, `.gitIgnore` | README now describes product/rename plan; legacy template remains unsafe/incomplete |
| Unrelated frontend config | `vite.config.js` | no corresponding installed frontend dependencies/source |

## Proposed module convention

Each future `apps/api/src/modules/<name>/` contains its module/controller/service/repository, DTOs, policies, and unit tests. Schema lives in `apps/api/src/database/schema/`; migrations in `apps/api/drizzle/`; HTTP/integration tests in `apps/api/test/`. `apps/web/` owns Next.js; `apps/docs/` owns Astro documentation; `packages/shared/` owns deliberately shared public contracts only. No backend service imports legacy `index.js`; no frontend/shared package imports database implementation. Current Markdown stays under `docs/` until a reviewed relocation.

## MVP ownership

MVP events below are logical future names only; no outbox/queue/socket infrastructure is required now. Initial expiry/recommendations/analytics are scoped REST queries. Only create files as features enter approved implementation.

| Feature → module | Controller/service/repository prefix | Tables | Proposed event | Proposed job | Required test focus |
| --- | --- | --- | --- | --- | --- |
| Register/login/recovery → auth | auth | users, auth_sessions, auth_action_tokens | none public | none | verification, password hash, rotation/replay/revocation |
| Business creation → businesses | businesses | businesses, business_memberships | none public | none | atomic owner creation, last-owner protection |
| Membership → access | access | users, roles, business_memberships, membership_locations | none public | none | privilege matrix, tenant/location isolation |
| Locations → locations | locations | inventory_locations | none initially | none | scoped administration and grants |
| Products/suppliers → catalog | catalog | products, categories, suppliers | catalog.product_updated deferred | none | domain unit/price policy, no legacy schema assumption |
| Purchase/stock → inventory | inventory | inventory, inventory_batches, inventory_movements | inventory.updated deferred | none in MVP | FEFO, concurrency, conservation |
| Sale → sales | sales | orders, sale_items, sale_item_batch_allocations | sale.created, sale.updated deferred | none | idempotency, allocation/totals |
| Sales returns → sales | sales | sale_returns, sale_return_items; calls Inventory | sale.updated deferred | none | allocation caps, tax reversal, disposition, retries |
| Waste → waste | waste | waste_records; Inventory owns stock writes | waste.recorded deferred | none | cost and stock atomicity |
| Expiry → expiry | expiry service; inventory read controller | reads scoped batches/business thresholds | deferred | none; request-time query | warning boundaries, unknown expiry, location scope |
| Discounts → discounts | discounts | discounts; reads sales/stock | deferred | none; request-time baseline | reasons, floor/approval, coverage |
| Analytics → analytics | analytics, query repository | read-only sales/returns/stock/waste | none | none | joins, returns, tax, authorized locations |

## Deferred ownership — not MVP scaffolding

| Feature → module | Future controller/service/repository prefix | Tables | Possible event | Possible job | Eventual test focus |
| --- | --- | --- | --- | --- | --- |
| Cart → carts, only if required | carts | carts, cart_items | none | none | ownership/repricing |
| Reviews → reviews, only if required | reviews | reviews | none | none | visibility, actual required fields |
| Forecasts → forecasting | forecasting, baseline adapter | forecast_runs, forecast_predictions | forecast.completed | forecast-generation | coverage, no data leakage |
| Payments → payments | payments, providers/stripe.provider.ts | payments, payment_webhook_events | payment.updated | payment-reconcile | signature, replay, compensation |
| Delivery → outbox/jobs | outbox service/repository; no public controller | outbox_events | relays owned domain events | outbox-delivery | crash recovery, duplicate delivery |
| Realtime → realtime | realtime.gateway.ts; no business repository | no owned tables | forwards authorized event subset | none | room isolation, expiry/reconnect |

## Inputs, outputs, boundaries

- Controllers accept validated DTOs and verified principal context, then return versioned response DTOs. Repositories never trust raw request bodies.
- Inventory accepts stock commands and returns recorded movements/balances. Sales, returns, and Waste invoke it with the shared transaction context; they never directly adjust batches. Returned-goods disposal records provenance without double stock decrement.
- Catalog owns current product descriptions/prices; Sales owns historical snapshots. Editing catalog does not rewrite completed sales.
- Analytics reads authorized-location facts; future Forecasting follows the same scope. Neither silently mutates stock or applies discounts. Recommendations require explicit authorized approval.
- Payments accepts server-calculated order amounts and returns provider-neutral status. Provider-specific payloads stay inside adapters/inbox handling.
- Future Realtime accepts committed envelopes for authorized business/location/user rooms. Future jobs call application services under explicit scope; neither is a current/MVP dependency.

## File dependency flow

See [module and file diagrams](docs/content/architecture/diagrams.md). Database infrastructure supplies one transaction manager; domain services do not depend on gateways or worker implementations. Agent navigation starts with this map, then [change impact](CHANGE_IMPACT_MAP.md), then actual source existence checks.
