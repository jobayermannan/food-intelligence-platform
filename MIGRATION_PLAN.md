# Food Intelligence Platform — legacy data migration plan

**Current status:** Backend 2.0 has a fresh PostgreSQL schema and API. No MongoDB export, production data migration, destructive source operation, or dual-write has been run. The source Express/MongoDB prototype remains in `legacy/` and is reference material only. Its `index.js` architecture and insecure `/jwt` flow are not carried into Backend 2.0.

## Conditional import sequence

If a concrete compatibility requirement is approved, use **MongoDB → export → transformation → validation → PostgreSQL**. Export an immutable, access-controlled snapshot without modifying MongoDB. Profile collection counts, key shapes, duplicate natural keys and unknown fields before choosing mappings. Use a separately versioned transformation to stage records, map ObjectIds to UUIDs in a persistent crosswalk, and identify each record's owning business. Reject ambiguous ownership instead of guessing. Reconcile counts and key aggregates per collection, inspect exceptions, and rehearse the process in an isolated database before any cutover. Keep MongoDB read-only/archive access available until business sign-off; rollback means routing back to the source or restoring a pre-import PostgreSQL snapshot, never deleting the source.

| Legacy concept | Backend 2.0 mapping | Import concern |
| --- | --- | --- |
| `users` | `users` + `business_memberships` | No trustworthy legacy tenant ownership/roles; require verified identity and approved role assignment |
| `menu` | `products` + `categories` | Unknown units, product status, category and cost fields need explicit mapping/default policy |
| `carts` | Deferred `carts` + `cart_items` only if required | Resolve user ownership; do not import anonymous or cross-user carts blindly |
| `reviews` | Deferred `reviews` only if required | Validate authorship/content/product association |
| JWT | New password/verification/session system | Legacy email-only tokens are never imported or honored |

Track unknown fields in an exception report; do not discard them silently. Detect duplicates by normalized email/SKU and record chosen conflict resolutions. Reject invalid roles and arbitrary admin assignments. Map every ObjectId through a deterministic crosswalk, not string coercion. Where historical purchase/sale/waste data is missing, mark history unavailable; do not fabricate stock movements or analytics. Existing password hashes may be unusable or insecure, so require a secure password reset/verification flow rather than importing an unsafe token. Cart ownership must be established before linking carts to users. Reconciliation compares source counts, staged counts, accepted/rejected rows, mapped IDs, totals and samples, with an auditable exception log.

**Security blockers:** insecure JWT issuance, unprotected admin routes, arbitrary role assignment, cart ownership flaws, token logging, exposed environment values and missing authentication enforcement in the legacy prototype. None is acceptable compatibility behavior. Rotate any credential that may have existed in the old tracked environment example. The current Git snapshot avoids committing that example, but historical Git objects may still contain it; a separate reviewed history/secret rotation decision is required.

SQL migrations for the new empty PostgreSQL schema are independent of this conditional import. Apply them through `npm run db:migrate`; test with an isolated `_test` database. Review migrations and backups before applying to persistent environments.
