export type Region = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  status: string;
  story: string;
  responsibility: string;
  debug: string;
  tables?: string[];
};
export const regions: Region[] = [
  {
    id: "entry",
    title: "API entrance",
    subtitle: "Start the application",
    icon: "01",
    color: "blue",
    x: 70,
    y: 65,
    status: "MVP",
    story:
      "Every journey starts here. The server opens its doors, checks request shapes, and directs visitors to a controller.",
    responsibility:
      "main.ts creates NestJS, validation, CORS and Swagger. AppModule connects the domain modules.",
    debug:
      "API will not start? Check main.ts, config.ts and the health controller before debugging a business operation.",
  },
  {
    id: "auth",
    title: "Identity",
    subtitle: "Who are you?",
    icon: "02",
    color: "blue",
    x: 365,
    y: 65,
    status: "MVP",
    story:
      "Your personal passport. Register, verify your email, sign in, and keep your session active.",
    responsibility:
      "Argon2id passwords, email action tokens, JWT access tokens, rotating refresh sessions, logout and reset.",
    debug:
      "401 response? Check the bearer token, email verification and current auth_sessions row.",
    tables: ["users", "sessions", "actionTokens"],
  },
  {
    id: "common",
    title: "Access gates",
    subtitle: "Where may you go?",
    icon: "03",
    color: "blue",
    x: 660,
    y: 65,
    status: "MVP",
    story:
      "A passport is not a key to every restaurant. These gates check your business membership, role, and allowed locations.",
    responsibility:
      "AuthGuard verifies an active session. AccessService checks roles and location grants on service calls.",
    debug:
      "403 or 404? Trace AccessService.require and the member’s active status and location grants.",
    tables: ["memberships", "membershipLocations", "roles"],
  },
  {
    id: "business",
    title: "Businesses & people",
    subtitle: "Your restaurant world",
    icon: "04",
    color: "green",
    x: 70,
    y: 285,
    status: "MVP",
    story:
      "A business is its own world, with people, locations and settings. One person can join several worlds.",
    responsibility:
      "Creates owner membership, locations, member roles, access grants, expiry settings and security audit events.",
    debug:
      "Permission changes? Start at business.service.ts and check the last-owner and reauthentication rules.",
    tables: [
      "businesses",
      "memberships",
      "membershipLocations",
      "locations",
      "auditEvents",
    ],
  },
  {
    id: "catalog",
    title: "Product library",
    subtitle: "What do you buy and sell?",
    icon: "05",
    color: "green",
    x: 365,
    y: 285,
    status: "MVP",
    story:
      "The labels on your shelves: product names, units, selling prices, categories and suppliers. A product is not yet stock.",
    responsibility:
      "Business-scoped product, category and supplier records. Inventory gives those products quantities at locations.",
    debug:
      "Missing product or rejected receipt? Check product/category ownership, base unit, and active status.",
    tables: ["products", "categories", "suppliers"],
  },
  {
    id: "inventory",
    title: "Stock room",
    subtitle: "Every batch has a story",
    icon: "06",
    color: "green",
    x: 660,
    y: 285,
    status: "MVP",
    story:
      "Stock arrives in batches. Every arrival, sale, transfer, return, or loss leaves a movement explaining what changed.",
    responsibility:
      "Receipts, exact unit conversion, batches, FEFO allocation, transfers, adjustments and locked stock balances.",
    debug:
      "Wrong stock? Compare inventory.onHand, batch.remaining and the movement ledger for the same product/location.",
    tables: ["inventory", "batches", "movements"],
  },
  {
    id: "sales",
    title: "Sales & returns",
    subtitle: "From shelf to customer",
    icon: "07",
    color: "orange",
    x: 70,
    y: 505,
    status: "MVP",
    story:
      "A sale chooses the earliest-expiring usable stock and calculates the bill. A return points back to what was actually sold.",
    responsibility:
      "Server-priced orders, tax and discount snapshots, batch allocations, bounded returns and explicit restocking.",
    debug:
      "Sale failed? Check location access, saleable stock, discount validity and the original allocation for returns.",
    tables: [
      "orders",
      "saleItems",
      "allocations",
      "saleReturns",
      "returnItems",
      "discounts",
    ],
  },
  {
    id: "waste",
    title: "Waste journal",
    subtitle: "Explain every loss",
    icon: "08",
    color: "orange",
    x: 365,
    y: 505,
    status: "MVP",
    story:
      "Spoiled or damaged food is recorded with its batch, quantity, reason and cost. It is never just a disappearing number.",
    responsibility:
      "Stock waste writes a waste record, movement and balance decrement in one transaction. Returned disposal avoids double decrement.",
    debug:
      "Waste rejected? Check batch/location match, positive quantity, stock availability and notes for “other”.",
    tables: ["wasteRecords", "movements", "batches"],
  },
  {
    id: "insights",
    title: "Lookout tower",
    subtitle: "See risks and patterns",
    icon: "09",
    color: "purple",
    x: 660,
    y: 505,
    status: "MVP",
    story:
      "Look across your permitted shelves: what expires soon, what sells, and what is being wasted? Recommendations are simple rules.",
    responsibility:
      "Request-time expiry, scoped analytics and explicit discount approval. Baseline recommendations are not ML.",
    debug:
      "Unexpected report? Check authorized locations, expiry timezone, source records and known result-limit gaps.",
    tables: ["discounts", "orders", "saleItems", "wasteRecords", "batches"],
  },
  {
    id: "database",
    title: "Shared record book",
    subtitle: "PostgreSQL + Drizzle",
    icon: "DB",
    color: "slate",
    x: 365,
    y: 745,
    status: "MVP",
    story:
      "One reliable record book, divided by business ownership. Transactions keep related changes together.",
    responsibility:
      "Schema, composite tenant references, constraints, database connection and versioned migrations.",
    debug:
      "Database failure? Check readiness, migration state, foreign keys and the isolated test database.",
  },
  {
    id: "web",
    title: "Product frontend",
    subtitle: "Next.js • running product UI",
    icon: "↗",
    color: "slate",
    x: 70,
    y: 975,
    status: "MVP",
    story:
      "The everyday workspace connects people to stock, sales, waste and insight. This architecture portal is a separate learning tool.",
    responsibility:
      "apps/web uses Next.js for screens and a same-origin /api rewrite to NestJS. It keeps access tokens in memory and the refresh cookie HttpOnly.",
    debug: "Start at apps/web/src/features for a screen, components/workspace.tsx for business and location state, or lib/api.ts for requests.",
  },
  {
    id: "ml",
    title: "Forecasting & AI",
    subtitle: "Future exploration",
    icon: "✦",
    color: "slate",
    x: 365,
    y: 1190,
    status: "Future",
    story:
      "Future models can learn from reliable sales and waste history. The current recommendation engine uses explicit rules.",
    responsibility:
      "Advanced forecasting, recommendations and external integrations remain deferred.",
    debug:
      "Do not look for model training, Redis workers, payment processing or realtime modules in this MVP.",
  },
  {
    id: "legacy",
    title: "Legacy archive",
    subtitle: "Reference only",
    icon: "⌁",
    color: "slate",
    x: 660,
    y: 1190,
    status: "Legacy",
    story:
      "The old Express/MongoDB prototype is a reference shelf. Its source has been preserved; it is not the foundation of the new backend.",
    responsibility:
      "legacy/index.js and legacy/package.json. No live MongoDB migration or deletion was performed.",
    debug:
      "Do not reuse the old /jwt behavior or treat legacy roles as trusted identities.",
  },
];
export const mapEdges = [
  ["web", "entry", "/api"],
  ["entry", "auth", "routes"],
  ["auth", "common", "session"],
  ["common", "business", "membership"],
  ["business", "catalog", "owns"],
  ["catalog", "inventory", "stocked as"],
  ["inventory", "sales", "FEFO"],
  ["inventory", "waste", "loss"],
  ["inventory", "insights", "expiry"],
  ["sales", "database", "transactions"],
  ["waste", "database", "transactions"],
  ["insights", "database", "queries"],
];
export type Step = {
  region: string;
  title: string;
  detail: string;
  file: string;
  method?: string;
};
export const workflows: {
  id: string;
  title: string;
  label: string;
  description: string;
  steps: Step[];
}[] = [
  {
    id: "sale",
    title: "Follow a sale",
    label: "MOST CONNECTED",
    description:
      "Watch one request travel from the API to stock allocation and a saved order.",
    steps: [
      {
        region: "common",
        title: "Check the passport",
        detail:
          "AuthGuard verifies the access token and looks up the active session and verified user.",
        file: "common/auth.guard.ts",
        method: "canActivate",
      },
      {
        region: "sales",
        title: "Enter through the sales desk",
        detail:
          "POST /api/v1/businesses/:businessId/orders accepts location, lines and a request key. DTO validation checks the shape.",
        file: "sales/sales.controller.ts",
        method: "create",
      },
      {
        region: "common",
        title: "Check the right restaurant",
        detail:
          "The service requires OWNER, ADMIN or STAFF. Staff need an explicit grant for the requested location.",
        file: "common/access.service.ts",
        method: "require",
      },
      {
        region: "sales",
        title: "Calculate the bill",
        detail:
          "The server reads current product prices and approved discounts, then snapshots rounded amounts and the business tax rate.",
        file: "sales/sales.service.ts",
        method: "sell",
      },
      {
        region: "inventory",
        title: "Pick the right batches",
        detail:
          "Lock the position and eligible batches. Allocate first-expiring stock, excluding expired and unknown-expiry batches. Reject shortages.",
        file: "inventory/inventory.service.ts",
        method: "allocate",
      },
      {
        region: "database",
        title: "Save everything together",
        detail:
          "The transaction writes order items, batch allocations and SALE movements, and updates balances. A failure rolls back the transaction.",
        file: "database/schema.ts",
      },
    ],
  },
  {
    id: "onboarding",
    title: "Open your business",
    label: "START HERE",
    description:
      "From a new account to a business with controlled location access.",
    steps: [
      {
        region: "auth",
        title: "Create your passport",
        detail:
          "Register with email, password and display name. Argon2id hashes the password and a single-use verification token is mailed.",
        file: "auth/auth.service.ts",
        method: "register",
      },
      {
        region: "auth",
        title: "Verify and sign in",
        detail:
          "Read the token in the development Mailpit inbox. Verification allows login; login issues an access token and refresh cookie.",
        file: "auth/auth.service.ts",
        method: "login",
      },
      {
        region: "business",
        title: "Create a business",
        detail:
          "A verified user creates a business with currency, timezone, tax rate and request key. The same transaction makes them OWNER.",
        file: "business/business.service.ts",
        method: "create",
      },
      {
        region: "business",
        title: "Add locations and members",
        detail:
          "Create a location. Add a verified existing user by account ID, then explicitly grant STAFF/VIEWER access to locations.",
        file: "business/business.service.ts",
        method: "setLocations",
      },
    ],
  },
  {
    id: "receipt",
    title: "Receive new stock",
    label: "INVENTORY",
    description: "Turn a product definition into traceable food on a shelf.",
    steps: [
      {
        region: "catalog",
        title: "Define the product",
        detail:
          "Choose category, SKU, fixed base unit and sale price. Suppliers belong to the same business.",
        file: "catalog/catalog.service.ts",
        method: "createProduct",
      },
      {
        region: "inventory",
        title: "Check the receipt",
        detail:
          "Validate active product/location/supplier, positive quantity, compatible units, acquisition total and expiry status.",
        file: "inventory/inventory.service.ts",
        method: "receive",
      },
      {
        region: "inventory",
        title: "Convert and value",
        detail:
          "Only kg↔gram and litre↔ml conversions are supported. The batch unit cost comes from acquisition total divided by base quantity.",
        file: "inventory/inventory.service.ts",
        method: "convert",
      },
      {
        region: "database",
        title: "Record the arrival",
        detail:
          "Create a batch, write a PURCHASE movement and increase the location’s stock balance in one transaction.",
        file: "database/schema.ts",
      },
    ],
  },
  {
    id: "waste",
    title: "Record food waste",
    label: "TRACEABILITY",
    description: "Explain a loss while keeping the stock book balanced.",
    steps: [
      {
        region: "common",
        title: "Check location access",
        detail:
          "OWNER, ADMIN or assigned STAFF can record waste. An ID from another business grants no access.",
        file: "common/access.service.ts",
        method: "require",
      },
      {
        region: "waste",
        title: "Explain the loss",
        detail:
          "Choose the batch and positive base-unit quantity. “Other” requires notes. Check that the batch belongs to this location.",
        file: "waste/waste.service.ts",
        method: "record",
      },
      {
        region: "database",
        title: "Update atomically",
        detail:
          "Lock stock, verify availability, snapshot waste cost, write a WASTE movement and decrement both balances together.",
        file: "database/schema.ts",
      },
    ],
  },
  {
    id: "return",
    title: "Return a sold item",
    label: "CORRECTION",
    description:
      "Trace the original sale before reversing money or restocking.",
    steps: [
      {
        region: "sales",
        title: "Find the original allocation",
        detail:
          "An OWNER or ADMIN references the original order and allocation. The return cannot exceed quantities already sold minus prior returns.",
        file: "sales/sales.service.ts",
        method: "returnSale",
      },
      {
        region: "sales",
        title: "Calculate the reversal",
        detail:
          "Use the original line net and tax amounts, with final remainder reconciliation. No external payment is processed.",
        file: "sales/sales.service.ts",
        method: "returnSale",
      },
      {
        region: "inventory",
        title: "Choose stock disposition",
        detail:
          "Restocked and disposed quantities are explicit. Unknown or expired batches cannot be restocked; physical inspection remains an operational requirement.",
        file: "sales/sales.service.ts",
        method: "returnSale",
      },
      {
        region: "database",
        title: "Leave a trace",
        detail:
          "Persist return records. Restocking writes a RETURN movement. Returned-goods disposal records waste without subtracting stock again.",
        file: "database/schema.ts",
      },
    ],
  },
  {
    id: "expiry",
    title: "Spot expiry risk",
    label: "BASELINE RULES",
    description: "Understand the signals behind a suggested discount.",
    steps: [
      {
        region: "common",
        title: "Limit the view",
        detail:
          "Queries include only the caller’s business and authorized locations. Recommendations allow OWNER, ADMIN and VIEWER.",
        file: "common/access.service.ts",
        method: "require",
      },
      {
        region: "insights",
        title: "Classify the batches",
        detail:
          "Check expired first, then critical/warning thresholds. UNKNOWN and NONPERISHABLE remain separate states.",
        file: "insights/insights.service.ts",
        method: "expiry",
      },
      {
        region: "insights",
        title: "Suggest, do not change",
        detail:
          "The baseline rule compares approaching expiry with 14-day sales velocity. It returns a suggestion without changing stock or prices.",
        file: "insights/insights.service.ts",
        method: "recommendation",
      },
      {
        region: "insights",
        title: "Require human approval",
        detail:
          "OWNER/ADMIN explicitly approves a discount. See the known issue about rechecking batch cost when that discount is used later.",
        file: "insights/insights.service.ts",
        method: "approve",
      },
    ],
  },
];
export const findings = [
  {
    title: "Discount cost floor",
    region: "sales",
    detail:
      "Approval checks current batch costs; later sales do not recheck the floor against newly received stock.",
  },
  {
    title: "Inactive locations",
    region: "sales",
    detail:
      "Receiving and transfers reject inactive locations; sales and stock waste lack the same active-location check.",
  },
  {
    title: "Access-denial audit trail",
    region: "common",
    detail:
      "Denials use logger warnings; they are not persisted alongside membership audit events.",
  },
  {
    title: "Incomplete large result sets",
    region: "insights",
    detail:
      "Unpaginated limits can omit batches and aggregate rows without a completeness indicator.",
  },
  {
    title: "Login throttling",
    region: "auth",
    detail:
      "The limiter uses an in-process IP/email pair. Independent account/network limits and multi-instance coordination remain gaps.",
  },
  {
    title: "Return inspection policy",
    region: "sales",
    detail:
      "The API trusts an authorized operator’s restock quantity; it does not store a separate inspection attestation. Clarify the evidence required.",
  },
];
