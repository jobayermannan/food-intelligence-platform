---
title: Architecture and lifecycle diagrams
status: mixed
owner: Backend architecture
last_reviewed: 2026-10-01
order: 2
---

# Architecture and lifecycle diagrams

The first diagram is **CURRENT LEGACY PROTOTYPE / REFERENCE**. MVP diagrams describe the independent **Food Intelligence Platform** domain, not a refactor of index.js. Payment, queues, realtime, outbox, forecasting, and optional legacy concepts are explicitly **DEFERRED**, not MVP dependencies. Nothing here is implemented. [Domain](../../../PRODUCT_DOMAIN.md), [schema](../../../DATABASE_DESIGN.md), [API flows](../../../API_USER_FLOW.md), and [ownership](../../../CODEBASE_MAP.md) are canonical.

## 1. Current system

Current callers pass through CORS/JSON parsing to inline handlers and MongoDB. Auth middleware is not attached. Startup can accept HTTP before the database is ready.

```mermaid
flowchart LR
  C[Caller] --> E[Express in index.js]
  E --> R[Inline routes]
  R --> M[(MongoDB BistroDB)]
  M --> U[users]
  M --> P[menu]
  M --> V[reviews]
  M --> K[carts]
  E -.-> A[Token and admin middleware defined but unused]
```

## 2. MVP system architecture

Target monorepo is food-intelligence-platform. Current Markdown is still under docs; the portal's future home is apps/docs.

```mermaid
flowchart TB
  U[Business member] --> N[Next.js main UI - apps/web]
  N --> API[NestJS REST - apps/api]
  API --> A[Verified session and business and location access]
  A --> S[Independent application services]
  S --> R[Repositories and Drizzle]
  R --> PG[(PostgreSQL)]
  S --> IN[Inventory sales returns waste]
  PG --> Q[Scoped expiry analytics rule recommendations]
  D[Reviewed Markdown] --> AS[Astro 7 - apps/docs]
  AS --> H[Static documentation host]
  S -.-> FUT[Deferred jobs sockets payments and ML]
```

## 3. MVP backend module architecture

Business and location context reaches every owner. Sales, returns, and waste call Inventory's transactional boundary.

```mermaid
flowchart TB
  API[Controllers and DTOs] --> AUTH[Auth and Access]
  AUTH --> B[Businesses memberships and locations]
  AUTH --> C[Catalog and Suppliers]
  AUTH --> S[Sales and Returns]
  AUTH --> W[Waste]
  S --> I[Inventory]
  W --> I
  I --> U[Shared transaction]
  S --> U
  W --> U
  U --> R[Owned repositories]
  C --> R
  B --> R
  R --> DB[(Drizzle and PostgreSQL)]
  DB --> READ[Scoped Analytics and Expiry]
  READ --> D[Rule-based Discount policy]
```

## 4. Database ER diagrams — MVP and deferred

Twenty-one MVP table designs are independent of legacy schemas. Composite tenant/location keys and cross-row checks are specified in the schema document; these drawings are not executable DDL.

```mermaid
erDiagram
  businesses ||--o{ business_memberships : includes
  users ||--o{ business_memberships : joins
  roles ||--o{ business_memberships : grants
  users ||--o{ auth_sessions : authenticates
  users ||--o{ auth_action_tokens : verifies_or_recovers
  business_memberships ||--o{ membership_locations : grants
  inventory_locations ||--o{ membership_locations : scopes
  businesses ||--o{ inventory_locations : owns
  businesses ||--o{ products : owns
  businesses ||--o{ categories : owns
  businesses ||--o{ suppliers : owns
  categories o|--o{ products : groups
  products ||--o{ inventory : stocked_as
  inventory_locations ||--o{ inventory : holds
  inventory ||--o{ inventory_batches : contains
  suppliers o|--o{ inventory_batches : supplies
  inventory_batches ||--o{ inventory_movements : records
  businesses ||--o{ orders : owns
  inventory_locations ||--o{ orders : scopes
  orders ||--o{ sale_items : contains
  products ||--o{ sale_items : snapshots
  sale_items ||--o{ sale_item_batch_allocations : allocates
  inventory_batches ||--o{ sale_item_batch_allocations : fulfills
  sale_items o|--o{ inventory_movements : consumes
  orders ||--o{ sale_returns : reverses
  sale_returns ||--o{ sale_return_items : contains
  sale_item_batch_allocations ||--o{ sale_return_items : bounds
  sale_return_items o|--o{ inventory_movements : restocks
  products ||--o{ discounts : offers
  inventory_batches o|--o{ discounts : targets
  discounts o|--o{ sale_items : applies
  inventory_locations ||--o{ waste_records : scopes
  inventory_batches ||--o{ waste_records : traces
  sale_return_items o|--o{ waste_records : returned_disposal
  waste_records o|--o{ inventory_movements : stock_origin_only
```

The following eight candidates are deferred. Existing MVP entities appear only to show potential references; no migrations should create deferred tables prematurely.

```mermaid
erDiagram
  orders ||--o{ payments : future_attempts
  payments o|--o{ payment_webhook_events : future_resolves
  businesses ||--o{ forecast_runs : future_requests
  forecast_runs ||--o{ forecast_predictions : future_produces
  products ||--o{ forecast_predictions : future_predicts
  inventory_locations ||--o{ forecast_predictions : future_scopes
  businesses ||--o{ carts : optional_owns
  users ||--o{ carts : optional_owns
  carts ||--o{ cart_items : optional_contains
  products ||--o{ cart_items : optional_references
  businesses ||--o{ reviews : optional_owns
  users o|--o{ reviews : optional_authors
  products o|--o{ reviews : optional_receives
  businesses ||--o{ outbox_events : future_delivery
```

## 5. Inventory lifecycle

Stock never becomes negative. Transfers conserve quantities; expiry classification does not dispose stock.

```mermaid
flowchart LR
  P[Purchase or approved opening adjustment] --> V[Validate tenant location unit lot cost expiry]
  V --> T[Lock inventory and batches]
  T --> L[Atomic ledger batch and projection update]
  L --> O[Commit]
  O --> A[On-hand stock]
  A --> S[FEFO sale]
  A --> W[Authorized stock waste]
  A --> X[Same-business paired transfer]
  A --> R[Inspected return or adjustment]
  S --> T
  W --> T
  X --> T
  R --> T
```

## 6. MVP sales and return lifecycle

No cart or payment provider is required. Financial return recording is not evidence of external money movement.

```mermaid
flowchart TB
  C[Staff records sale at authorized location] --> P[Server price discount and tax snapshots]
  P --> L[Lock eligible FEFO batches]
  L --> E{Sufficient stock}
  E -->|Yes| T[Commit completed order allocations and stock ledger]
  E -->|No| R[Rollback and reject]
  T --> RET[Admin records return against original allocations]
  RET --> CAP[Lock and cap cumulative quantity and amount]
  CAP --> F[Immutable return rows]
  F --> I{Physical disposition}
  I -->|Inspected saleable| S[RETURN movement to original batch]
  I -->|Disposed returned goods| W[Linked waste fact without second stock decrement]
  I -->|No physical return| N[No stock change]
```

## 7. Waste lifecycle

Stock-origin waste decrements stock atomically; customer-return disposal must not subtract stock already removed by the original sale.

```mermaid
flowchart TB
  U[Authorized stock waste command] --> V[Validate tenant location batch quantity reason]
  V --> L[Lock and check batch availability]
  L --> T[Waste cost snapshot and negative movement]
  T --> B[Commit balances and facts]
  RET[Approved return disposal] --> F[Return-linked waste fact only]
  B --> A[Scoped waste analytics]
  F --> A
```

## 8. MVP expiry and discount flow

Request-time queries provide two warning levels. Future scans/notifications reuse this policy rather than owning separate rules.

```mermaid
flowchart TB
  J[Authorized expiry query] --> P[Business critical and warning thresholds]
  P --> C[Classify scoped positive batches]
  C --> E[Expired critical warning safe unknown nonperishable]
  E --> N[API alert list for permitted locations]
  E --> D[Eligible stock plus verified sales velocity]
  D --> R[Rule-based excess and discount suggestion]
  R --> X[Reasons coverage and algorithm version]
  X --> A[Owner or admin approval]
  A --> S[Server-side sale eligibility and snapshot]
```

## 9. MVP API request flow

Tenant and location checks precede queries and are repeated for referenced resources. No queued notification dependency exists.

```mermaid
sequenceDiagram
  participant C as Next.js caller
  participant H as NestJS boundary
  participant S as Application service
  participant D as PostgreSQL via Drizzle
  C->>H: Versioned REST request and identity
  H->>H: Validate session membership role location and DTO
  H->>S: Typed command and scoped context
  S->>D: Scoped transaction with invariants
  D-->>S: Commit
  S-->>H: Safe response DTO
  H-->>C: HTTP result
```

## 10. Deferred BullMQ and Redis flow

Queue delivery is at least once. PostgreSQL retains durable intent if Redis is unavailable.

```mermaid
flowchart LR
  O[(Committed outbox or scheduled run)] --> R[Relay or scheduler]
  R --> Q[BullMQ queue in Redis]
  Q --> W[Worker]
  W --> I[Idempotency and input validation]
  I --> S[Application service]
  S --> D[(PostgreSQL result)]
  W -->|Transient failure| B[Bounded retry and backoff]
  B --> Q
  W -->|Exhausted| F[Failed job retained and operator alerted]
```

## 11. Deferred Socket.IO event flow

Rooms derive from server-verified membership; clients cannot choose arbitrary business rooms.

```mermaid
sequenceDiagram
  participant C as Client
  participant G as Socket.IO gateway
  participant A as Auth and Access
  participant O as Outbox event dispatcher
  C->>G: Connect with valid identity
  G->>A: Verify session and business membership
  A-->>G: Permitted rooms
  O->>G: Committed versioned event
  G-->>C: Minimal authorized notification
  C->>C: Refresh REST state on gaps or reconnect
  A-->>G: Revoke or expire access
  G-->>C: Disconnect or remove rooms
```

## 12. Deferred payment flow

Future restaurant-order payments start in Stripe Test Mode, not SaaS billing. Webhook signatures, persisted idempotency, and compensation bridge the provider boundary. MVP sales do not invoke this flow.

```mermaid
sequenceDiagram
  participant C as Caller
  participant S as PaymentService
  participant D as PostgreSQL
  participant P as PaymentProvider adapter
  participant ST as Stripe Test Mode
  C->>S: Order ID and idempotency key
  S->>D: Validate order and persist pending payment
  S->>P: Provider-neutral payment command
  P->>ST: Tokenized or hosted request
  ST-->>P: Provider reference and next action
  P-->>S: Normalized result
  S->>D: Persist status
  S-->>C: Safe next action or status
  ST->>P: Signed webhook
  P->>P: Verify raw body signature
  P->>S: Normalized verified event
  S->>D: Deduplicate inbox and commit transition plus outbox
  S-->>ST: Acknowledge durable receipt
```

## 13. Deferred ML and data flow

When forecasting is approved, start with a statistical baseline. Both forecast persistence and external ML are outside this MVP; sufficient history and evaluation are prerequisites.

```mermaid
flowchart LR
  H[Verified completed sales and stock context] --> X[Extraction with coverage window]
  X --> C[Clean and flag missing days stockouts closures]
  C --> F[Versioned features without personal data]
  F --> B[Moving-average baseline]
  F -.-> M[Future Python or ML model adapter]
  B --> E[Rolling backtest against baseline metrics]
  M -.-> E
  E --> P[Versioned forecast run and predictions]
  P --> R[Human-reviewed inventory recommendations]
```

## 14. CI/CD flow

No workflow exists today. MVP needs isolated PostgreSQL and auth/tenant tests, not unused provider/queue services.

```mermaid
flowchart TB
  PR[Pull request] --> DOC[Links labels diagrams and later Astro build]
  PR --> CODE[Type lint unit integration and API tests]
  CODE --> DB[MVP migration and tenant-location tests]
  DB --> IMG[Docker build and API database readiness]
  IMG --> SEC[Security scan and quality gate]
  DOC --> G{Required checks pass}
  SEC --> G
  G --> A[Approved artifact]
  A --> ST[Staging verification]
  ST --> AP[Release approval and restore evidence]
  AP --> DEP[Deploy and observe]
  DEP --> REC[Compatible rollback or forward repair]
```

## 15. Target file and module dependency flow

All paths are proposed under food-intelligence-platform; no legacy index.js import is allowed. Shared public contracts never import server internals.

```mermaid
flowchart TB
  WEB[apps/web - Next.js] --> CONTRACT[packages/shared - safe contracts]
  API[apps/api controllers] --> CONTRACT
  API --> S[apps/api application services]
  S --> P[Domain policies]
  S --> R[Owned repositories]
  R --> U[Database unit of work]
  U --> SC[Drizzle schema and pg]
  TEST[apps/api/test] -.-> S
  DOC[apps/docs - Astro 7] --> MD[Reviewed Markdown only]
  INF[docker and .github] -.-> API
```

## 16. Multi-tenant access flow

A user can join multiple businesses, but every operation checks one business and a permitted location set.

```mermaid
flowchart TB
  U[Verified global user and active session] --> B[Requested business]
  B --> M{Active membership}
  M -->|No| X[Deny without data disclosure]
  M -->|Yes| R{Role permits action}
  R -->|No| X
  R -->|Yes| L[Owner-admin all locations or explicit staff-viewer grants]
  L --> Q[Repository with business and location filters]
  Q --> F[Composite same-business references]
  F --> D[Authorized result]
```

