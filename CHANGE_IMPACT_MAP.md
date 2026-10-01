# Change-impact map

Status: **Backend 2.0 MVP maintenance map** for Food Intelligence Platform. `legacy/index.js` is legacy CRUD reference, not domain logic to preserve. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) governs MVP/deferred scope; implemented files are listed in [CODEBASE_MAP.md](CODEBASE_MAP.md) under `apps/api/`. Compatibility is conditional on a real requirement.

| Change | Affected owners / what can break | Required evidence and documentation |
| --- | --- | --- |
| Repository/local/package identity | Workspace/editor paths, remotes, package/lockfile, future Docker labels | Follow README rename inventory; preserve local changes, verify destination and reopen; no data-volume/database rename |
| Documentation relocation | `docs/` → `apps/docs/`, root references, portal loader paths | Rewrite/test relative links and allowlist bases in one move; no duplicate editable source |
| Membership/location grant | Every repository, analytics aggregate, future job/socket room | Fresh session/membership checks, no-grant denial, cross-location and cross-business tests |
| Return/tax rounding | Sales returns, stock restock/disposal, revenue/waste analytics | Cumulative quantity/amount caps, final rounding remainder, no double stock decrement/cost loss |
| Product price | Catalog, cart checkout, Sales, Discounts; historical revenue changes if snapshots are overwritten | Repricing and snapshot tests; API contracts, database design, sales/discount pages |
| Product base unit/precision | Inventory, allocations, waste, forecasting; mixed units corrupt totals | Disallow casual edits after ledger use; approved conversion plan, conservation tests |
| Inventory schema | Inventory, Sales, Waste, Expiry, Analytics, Forecasting | Migration/reconciliation and concurrent stock tests; ER/map/flows updated |
| Expiry threshold/timezone | Expiry, FEFO, Discounts, notifications, at-risk reporting | Boundary/DST/date-only tests; central policy version, no scattered constants |
| Sale status or totals | Stock allocation, Payments, Analytics, Forecasting | State-transition/retry tests; money snapshots and event contract review |
| Waste reason/formula | Waste, stock ledger, Analytics, features | Allowlist/backward compatibility; denominator and unit/currency tests |
| Identity provider | Auth, sessions, verified user linkage, Carts, sockets | Session invalidation, spoofing/replay/ownership tests; migration plan |
| Role/membership policy | Every guarded route, workers acting for users, websocket rooms | Cross-business/role matrix tests; privileged-grant audit |
| Cart owner mapping | Carts, Users, Catalog, checkout | Quarantine ambiguous legacy links; never trust supplied email; API migration notice |
| Review fields | Reviews, import transform, clients | Preserve nullable/legacy semantics; escaped rendering, moderation policy |
| Payment provider | Payment adapter/config/webhook translation | Provider contract and replay/compensation tests; core Sales unchanged unless provider capabilities require an explicit business decision |
| Event name/payload | Outbox, workers, sockets, consumers | Versioned envelopes, duplicate/out-of-order tests; map and diagrams |
| Queue name/retry policy | Producers, workers, operations, deployment | Drain/version strategy; retry and poison-message tests; jobs runbook |
| Forecast algorithm | Forecast adapter/features/evaluation, recommendation consumers | Version/provenance and rolling backtest; baseline retained; ML page |
| Database migration | All querying modules and deployments | Empty/upgrade/recovery rehearsal; expand-contract rollout; upgrade guide |
| API response/version | Actual Next.js/API clients and docs | OpenAPI diff; characterize old clients only when confirmed real; no speculative DTO compatibility layer |
| Astro portal | Documentation build/navigation only | Markdown links/diagrams/schema checks; backend dependency graph must remain unaffected |

## Safe change procedure

Identify current versus proposed behavior → read owner and callers → list affected tables, contracts, events, jobs, clients → design migration/rollback → change the smallest approved scope → run focused checks → update canonical documentation in the same change. Do not rename proposed paths as implemented until the files and tests actually exist.

Schema constraints are defense in depth, not a replacement for business authorization. An adapter hides payment syntax, not semantic differences such as unsupported authorization/refund behavior. Document such differences before switching providers.
