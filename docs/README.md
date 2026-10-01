# Food Intelligence Platform — documentation portal architecture

Status: **Phase 0 documentation structure, not a runnable Astro application**. Current authored content is in `docs/`; target portal is **`apps/docs/`** inside `food-intelligence-platform/`. No directory moves, packages, scripts, routes, or app source were created. Next.js belongs in `apps/web/`; NestJS in `apps/api/`. Express/MongoDB is legacy reference, not the new domain foundation. [PRODUCT_DOMAIN.md](../PRODUCT_DOMAIN.md) governs MVP versus future scope.

## Ownership boundary

Astro renders documentation only. It must not implement backend APIs, authentication, database access, inventory logic, payment actions, business services, or user application screens. Build the portal from local reviewed content; never connect it to production MongoDB/PostgreSQL, Redis, payment credentials, or customer records. If private hosting is needed, use separately reviewed host-level access controls rather than copying business authentication into Astro.

## Physical content structure created now

`docs/content/` contains overview, architecture, setup, backend, database, api, inventory, sales, waste, expiry, discounts, payments, realtime, jobs, analytics, ml, testing, deployment, security, maintenance, agents, and upgrades. Each has an `index.md` with status metadata, purpose, and canonical links. Architecture also contains `diagrams.md`. `docs/public/` is reserved for reviewed nonsecret static assets.

## Proposed application structure — not created

```text
apps/docs/
  package.json                 # independent Astro 7 dependency/build boundary
  package-lock.json            # exact tested dependency versions
  astro.config.mjs             # static documentation output only
  tsconfig.json
  src/
    content.config.ts          # local content collections and metadata validation
    pages/
      index.astro              # documentation landing page
      [...slug].astro          # prebuilt document routes
    layouts/DocsLayout.astro
    components/                # navigation, status badges, diagram presentation
    styles/
  content/                     # actual authored topic pages
  public/                      # sanitized static assets only
```

Astro's [7.0 release announcement](https://astro.build/blog/astro-7/) confirms the requested major version. Its [content collections API](https://docs.astro.build/en/reference/modules/astro-content/) supports schema-validated local content collections. Choose and pin the exact Astro 7 patch, Node runtime, and renderer compatibility during the separately approved implementation. Do not add a second root runtime or backend dependency to support documentation.

## Canonical source and navigation

The eleven root design documents are authoritative, led by PRODUCT_DOMAIN.md; topic pages provide navigation and focused policy. After an approved move, the future build loads `apps/docs/content/**/*.md` and an explicit eleven-file root allowlist. Current files stay in `docs/content/` until then. Root pages get routes such as `/reference/product-domain/`; topic pages map to `/architecture/`, `/inventory/`, etc. Never publish arbitrary root files through a broad glob.

| Canonical root source | Planned portal route |
| --- | --- |
| PRODUCT_DOMAIN.md | /reference/product-domain/ |
| BACKEND_AUDIT.md | /reference/backend-audit/ |
| STACK_DECISION.md | /reference/stack-decision/ |
| MIGRATION_PLAN.md | /reference/migration-plan/ |
| DATABASE_DESIGN.md | /reference/database-design/ |
| CODEBASE_MAP.md | /reference/codebase-map/ |
| CHANGE_IMPACT_MAP.md | /reference/change-impact-map/ |
| API_USER_FLOW.md | /reference/api-user-flow/ |
| AGENTIC_DEVELOPMENT_GUIDE.md | /reference/agentic-development-guide/ |
| USER_MANUAL.md | /reference/user-manual/ |
| UPGRADE_GUIDE.md | /reference/upgrade-guide/ |

During future rendering, resolve relative `.md` links against each source file, map allowlisted Markdown files to generated routes, preserve anchors, and map code references to an explicit repository revision. Fail builds on unresolved links instead of silently copying content. Root files remain readable directly in GitHub. A virtual metadata adapter supplies root-document title/status/order from the allowlist; do not maintain a second editable content copy.

Relocation changes topic-to-root links from `../../../` to `../../../../` and portal-README-to-root links from `../` to `../../`. Update source links, root-to-portal links, source allowlist base paths, and any hosted base URL in one reviewed move, then rerun link/build checks. Keep no duplicate editable `docs/` and `apps/docs/` trees. No application runtime or migration should depend on documentation routes.

Sidebar order follows: overview → architecture → setup → backend → database → api → inventory → sales → waste → expiry → discounts → payments → realtime → jobs → analytics → ml → testing → deployment → security → maintenance → agents → upgrades. Reference documents are cross-linked in relevant sections.

## Content contract

Topic pages carry `title`, `status`, `owner`, `last_reviewed`, and `order`. Status values are `current`, `target`, `future`, or `mixed`; mixed pages must label each subsection. Every proposed file/endpoint is marked unimplemented. Keep root reference metadata in the explicit build allowlist. Every rule has one canonical source and links from related topics.

Use fenced Mermaid for architecture/data flows and ER diagrams. Future rendering must use a pinned compatible renderer, strict security configuration, no arbitrary HTML/click callbacks, accessible descriptions, and a text fallback. Diagram source remains in Markdown. Build-time rendering is preferred for static pages; do not imply plain Astro renders Mermaid without integration. Phase 0 does not install a renderer.

## Future documentation quality gates

Validate frontmatter, duplicate slugs, relative links, root-source route mapping, Mermaid syntax/rendering, static build, keyboard navigation, readable contrast, mobile overflow, and absence of secrets. Check that current/target/future labels agree with source. Generate OpenAPI from implemented NestJS later and publish only sanitized versioned artifacts. CI can require related maps/doc changes for modified API/schema/events/jobs; manual review still checks semantics.

No portal build, preview, publication, or deployment has occurred. This design is ready for a separate documentation-runtime implementation approval, independent of backend Phase 1.

## Historical Phase 0 verification record

On 2026-09-30 the first documentation pass checked 35 new Markdown files, 81 local links, 25 candidate table designs, 22 topics, and 15 architecture Mermaid blocks. This is historical evidence, not the current count after the domain correction. The revised design separates 21 MVP tables and eight deferred candidates, adds PRODUCT_DOMAIN.md, changes README branding, and retains the actual legacy directory/package/source unchanged. Mermaid visual rendering and an Astro build remain unverified because no toolchain was created.

## Domain correction verification — 2026-10-01

Checked all 37 Markdown documents, 120 local link targets, 20 Mermaid fenced blocks across the documents (17 on the architecture page), all 22 topic sections, and coverage of 21 MVP plus eight deferred table designs. All original 25 candidate tables remain accounted for; four additions have domain rationale. Checked fence balance, required metadata, duplicate section headings, trailing whitespace, and documentation-only scope. Only README changed among previously tracked files; application/package files, local folder, and Git remote remain unchanged. No runtime build/test, Mermaid rendering, data operation, or rename was performed.
