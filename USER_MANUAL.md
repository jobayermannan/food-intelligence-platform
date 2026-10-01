# Food Intelligence Platform — user manual

This manual describes the **implemented Backend 2.0 API** in `apps/api`. It has no graphical frontend yet. The legacy Express/MongoDB API in `legacy/` is a reference only and has known security blockers; do not use its `/jwt` endpoint for this product.

## Start and sign in

Follow [README.md](README.md) to start PostgreSQL, Mailpit and the API. Browse `http://localhost:3000/api/docs` for the request schemas and endpoint list. Register with email, display name and a password of at least 12 characters at `POST /api/v1/auth/register`. Retrieve the verification token from Mailpit and submit it to `POST /api/v1/auth/verify-email`. Log in at `POST /api/v1/auth/login`. The response contains a 10-minute bearer access token and sets an HttpOnly refresh cookie. Use `POST /api/v1/auth/refresh` with the cookie and matching `Origin` header to rotate it. `POST /api/v1/auth/logout` and `logout-all` revoke sessions. `forgot-password` and `reset-password` use single-use mailed tokens.

Never store an access token or refresh token in browser local storage. On HTTPS deployment keep the refresh cookie Secure and use the configured application origin. The login flow requires a verified email and password; it does not accept an arbitrary email to issue a token.

## Set up a business

An authenticated user creates a business with name, IANA timezone, three-letter currency, default tax rate (fraction such as `0.10`), and a unique `requestKey`. Creation makes that user OWNER. The same global user may belong to several businesses; each request uses the chosen business ID and checks current membership. Create one or more locations, then categories, suppliers and products. A product has a fixed base unit (`piece`, `package`, `kg`, `gram`, `litre`, or `ml`) and sale price. Only kg/gram and litre/ml are converted exactly; piece/package use integer counts.

OWNER and ADMIN manage locations and operational catalog data. OWNER can grant higher roles after password reauthentication. ADMIN can grant only STAFF/VIEWER. STAFF and VIEWER receive explicit location grants; without a grant they cannot access that location. STAFF receives stock, records sales, and records waste at assigned locations. VIEWER reads assigned-location inventory and analytics. Membership revocation is checked on the next request. The last OWNER cannot be removed or demoted. OWNER can review redacted membership/role/grant audit events at `GET /api/v1/businesses/{businessId}/audit-events`.

## Inventory, sales, returns and waste

Receive stock through `POST /api/v1/businesses/{businessId}/inventory/purchases` with product, location, quantity/unit, acquisition total, expiry status/date and operation key. Each receipt creates a batch and PURCHASE movement. Expiry dates are local calendar dates in the business timezone: stock remains usable through that date. UNKNOWN expiry stays separate from NONPERISHABLE and is not automatically saleable.

Create a sale at `POST /api/v1/businesses/{businessId}/orders`. One order belongs to one location and may contain multiple products. The API uses the current product price, one approved percentage discount per line if supplied, the business tax rate, and eligible batches in first-expire-first-out order. It records line snapshots, allocations and SALE movements atomically. Insufficient stock fails without a partial sale. Reusing a sale request key with different content fails.

OWNER/ADMIN can transfer stock between locations, preserving cost and expiry with linked TRANSFER_OUT/TRANSFER_IN movements. They can also make reasoned adjustments. Returns reference original allocations; quantities cannot exceed sold quantities. A physically inspected saleable return can be restocked with a RETURN movement. Disposed customer goods are recorded as waste without decrementing stock a second time. Ordinary stock waste records a reason, batch, quantity, cost and WASTE movement. `other` reason requires notes.

`GET /api/v1/businesses/{businessId}/inventory/expiry` reports EXPIRED, CRITICAL, WARNING, SAFE, UNKNOWN and NONPERISHABLE states. Thresholds default to 24 and 72 hours and can be changed per business. `POST /discount-recommendations` returns a deterministic **Baseline recommendation** from expiry and recent sales; it makes no change. OWNER/ADMIN must explicitly approve a discount. The API enforces a percentage ceiling and batch-cost floor. `GET /analytics/{kind}` supports inventory, sales, revenue, waste, expiry and product performance within the caller's locations.

## Current limits

The MVP has no online payment processing, cart/review API, POS integration, forecasting service, ML model, queues, realtime feed, notification delivery, or frontend. The local email sink and in-memory rate limiter need production replacements before multi-instance deployment. The API is operational, but tax handling is a deliberately simple default-rate model and is not a jurisdictional fiscal engine. See [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) for the model and [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the non-destructive legacy data strategy.
