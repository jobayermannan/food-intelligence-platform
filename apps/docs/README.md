# Food Intelligence Platform — documentation portal architecture

`apps/docs/content/` contains reviewed Markdown topic pages and Mermaid diagrams, with `apps/docs/public/` reserved for safe static assets. **The Astro 7 runtime is not installed yet**; these files define its content architecture. Astro will render documentation only. It must never host the product frontend, backend APIs, authentication, business logic, inventory operations, or database access. The main frontend remains a future Next.js app at `apps/web`; the implemented backend is NestJS at `apps/api`.

## Content tree

`overview`, `architecture`, `setup`, `backend`, `database`, `api`, `inventory`, `sales`, `waste`, `expiry`, `discounts`, `payments`, `realtime`, `jobs`, `analytics`, `ml`, `testing`, `deployment`, `security`, `maintenance`, `agents`, and `upgrades` each have an `index.md`. `architecture/diagrams.md` holds Mermaid flows. Topic frontmatter has title, status, owner, review date and order. Status must distinguish implemented MVP, legacy reference and deferred architecture. Root documents, led by [PRODUCT_DOMAIN.md](../../PRODUCT_DOMAIN.md), remain canonical.

## Future Astro 7 application

When portal implementation is authorized, add a pinned Astro 7 package/config under `apps/docs`, load local Markdown into content collections, validate frontmatter, prebuild static pages and use a reviewed explicit allowlist for root reference documents. Do not glob arbitrary repository files or include `.env`, customer data or server code in the published output. Keep diagrams as Mermaid-rendered documentation. Add link/frontmatter/build checks in CI then. The current content move did not create a runnable portal.

[README.md](../../README.md) describes what is implemented now. [CODEBASE_MAP.md](../../CODEBASE_MAP.md) maps the API files. The legacy audit is historical; future payments/queues/realtime/ML diagrams remain labelled deferred.
