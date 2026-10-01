# Food Intelligence Platform — database design

**Implemented:** PostgreSQL shared-schema MVP under `apps/api/src/database/schema.ts` with Drizzle SQL migrations in `apps/api/drizzle/`. Each business-owned operational row carries `business_id`; composite foreign keys and uniqueness constraints reinforce same-business references. Application membership/location checks remain mandatory. PostgreSQL row-level security is future defense in depth, not the current authorization mechanism.

## MVP tables

| Area | Tables | Key rule |
| --- | --- | --- |
| Identity | `users`, `roles`, `business_memberships`, `auth_sessions`, `auth_action_tokens`, `audit_events` | Global users, business roles, hashed refresh/action tokens |
| Tenant | `businesses`, `inventory_locations`, `membership_locations` | Multiple businesses/user and locations/business; explicit staff/viewer grants |
| Catalog | `categories`, `products`, `suppliers` | Business-owned SKU/category and fixed product base unit |
| Stock | `inventory`, `inventory_batches`, `inventory_movements` | Location/product position, multi-batch stock, immutable signed movement ledger |
| Sales | `orders`, `sale_items`, `sale_item_batch_allocations` | One business/location per order; line price/tax/discount snapshots; FEFO allocations |
| Returns | `sale_returns`, `sale_return_items` | Bounded original allocations and proportional monetary reversal |
| Waste/discount | `waste_records`, `discounts` | Stock/customer-return origin, cost snapshot; explicit approved percentage rule |

The schema has 22 tables. `numeric(18,6)` stores quantities and `numeric(20,6)` stores monetary/cost values; Decimal.js performs authoritative calculations. Currency-specific rounding occurs per sale line and persisted totals are constrained. Inventory and batch quantities cannot be negative. Product units are `piece`, `package`, `kg`, `gram`, `litre`, and `ml`; piece/package are integer quantities. Batch expiry is stored as the **exclusive next-day start** in the business timezone, with separate known/unknown/nonperishable status. FEFO excludes expired and unknown batches from sale allocation. Movement types include PURCHASE, SALE, WASTE, TRANSFER_OUT, TRANSFER_IN, RETURN and ADJUSTMENT.

`businesses.created_by_user_id + creation_key`, `orders.business_id + request_key`, `sale_returns.business_id + request_key`, `waste_records.business_id + operation_key`, and movement keys support operation deduplication. Business/waste hashes reject a reused key with different content; preexisting rows without hashes are treated as conflicts. The order and return request hashes are non-null. Session token hashes are unique; only hashes are stored.

No carts, reviews, payments, payment webhooks, forecast runs/predictions or outbox events exist in the MVP. They are future candidates only, even though Phase 0 diagrams discuss them. [PRODUCT_DOMAIN.md](PRODUCT_DOMAIN.md) defines the business rules; [MIGRATION_PLAN.md](MIGRATION_PLAN.md) explains why no live MongoDB data has been moved.

## Migration safety

Migration `0000` creates its unique indexes before composite foreign keys (required by PostgreSQL), followed by additive migrations. Run against a fresh isolated database first, review generated SQL, back up persistent data before applying to a non-test environment, and test rollback by restore. The CI test database name ends in `_test`. No destructive MongoDB migration is part of these SQL files.
