import type generated from "../data/generated.json";
import { regions, mapEdges, workflows, findings } from "../data/guide";

type Atlas = typeof generated;
type File = Atlas["files"][number] | Atlas["repositoryFiles"][number];
const payload = JSON.parse(
  document.querySelector("#atlas-data")!.textContent!,
) as {
  atlas: Atlas;
  documents: {
    slug: string;
    title: string;
    category: string;
    status: string;
  }[];
};
const { atlas, documents } = payload;
const allFiles: File[] = [...atlas.files, ...atlas.repositoryFiles];
const host = document.querySelector<HTMLElement>("#view-content")!;
const esc = (v: unknown) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const short = (p: string) => p.split("/").at(-1)!;
const fileByPath = (p: string) => allFiles.find((f) => f.path === p);
const source = (p: string, line = 1) =>
  `${atlas.repo}/blob/${atlas.revision}/${p.split("/").map(encodeURIComponent).join("/")}#L${line}`;
const link = (
  view: string,
  key: string,
  value: string,
  label: string,
  cls = "",
) =>
  `<a class="${cls}" href="#${view}?${key}=${encodeURIComponent(value)}">${esc(label)}</a>`;
const fileLink = (p: string, label = short(p)) =>
  link("files", "path", p, label, "file-link");
const pill = (s: string, cls = "") =>
  `<span class="tag ${cls}">${esc(s)}</span>`;
let technical = false,
  showFuture = false,
  zoom = 0.72,
  offset = { x: 10, y: 15 };
let query = "";
const state = () => {
  const [view, params] = location.hash.slice(1).split("?");
  return { view: view || "map", params: new URLSearchParams(params) };
};
const method = (s: string) =>
  `<span class="http-method ${s.toLowerCase()}">${esc(s)}</span>`;
const regionName = (id: string) =>
  regions.find((r) => r.id === id)?.title ?? id;
const regionFiles = (id: string) => id === "web"
  ? atlas.repositoryFiles.filter((f) => f.path.startsWith("apps/web/src/"))
  : atlas.files.filter((f) => f.group === id);
const tableLink = (id: string) =>
  link(
    "database",
    "table",
    id,
    atlas.tables.find((t) => t.id === id)?.name ?? id,
    "table-link",
  );
const pathBox = (p: string, line = 1) =>
  `<div class="path-box"><code>${esc(p)}</code><button class="icon-button" data-copy="${esc(p)}" aria-label="Copy file path">⧉</button></div>${fileByPath(p)?.sourceAvailable ? `<a class="source-link" href="${source(p, line)}" target="_blank" rel="noreferrer">Committed source · line ${line} ↗</a>` : '<span class="hint">New local file · source link appears after it is committed and available on GitHub.</span>'}`;
function inspector(id: string) {
  const r = regions.find((r) => r.id === id) ?? regions[5];
  const files = regionFiles(r.id),
    routes = atlas.endpoints.filter((e) => e.group === r.id),
    issues = findings.filter((f) => f.region === r.id);
  return `<aside class="inspector" aria-label="Selected module"><div class="inspector-top"><span class="eyebrow">YOU ARE EXPLORING</span>${pill(r.status, r.status === "MVP" ? "live" : "")}</div><div class="region-symbol ${r.color}">${r.icon}</div><h2>${esc(r.title)}</h2><p class="inspector-lead">${esc(technical ? r.responsibility : r.story)}</p><div class="inspector-stats"><span><b>${files.length}</b> source files</span><span><b>${routes.length}</b> API routes</span></div><h3>Where to look</h3><div class="file-stack">${
    files
      .slice()
      .sort(
        (a, b) =>
          (a.role === "service" ? -1 : 1) - (b.role === "service" ? -1 : 1),
      )
      .map((f) => `<div>${fileLink(f.path)}<small>${esc(f.role)}</small></div>`)
      .join("") ||
    '<p class="muted">No MVP module. This region is reference or future scope.</p>'
  }</div>${r.tables?.length ? `<h3>Connected records</h3><div class="chips">${r.tables.map(tableLink).join("")}</div>` : ""}<div class="debug-note"><span>⌁ DEBUGGING COMPASS</span><p>${esc(r.debug)}</p></div>${issues.length ? `<a href="#risks" class="risk-inline">${issues.length} known review item${issues.length > 1 ? "s" : ""} →</a>` : ""}<a class="button secondary wide" href="#workflows">Follow a workflow →</a></aside>`;
}
function renderMap(selected: string) {
  const visible = regions.filter((r) => showFuture || r.status === "MVP");
  const edges = mapEdges
    .map(([from, to, label]) => {
      const a = regions.find((r) => r.id === from)!,
        b = regions.find((r) => r.id === to)!;
      if (from === "web" && to === "entry")
        return `<path class="connection ${selected === from || selected === to ? "highlight" : ""}" d="M${a.x} ${a.y + 66} H35 V${b.y + 66} H${b.x}" marker-end="url(#arrow)"/><text class="edge-label" x="43" y="${a.y - 15}">${esc(label)}</text>`;
      if (a.y === b.y)
        return `<path class="connection ${selected === from || selected === to ? "highlight" : ""}" d="M${a.x + 242} ${a.y + 66} H${b.x}" marker-end="url(#arrow)"/>`;
      const ax = a.x + 121,
        ay = a.y + 132,
        bx = b.x + 121,
        by = b.y;
      const mid = (ay + by) / 2;
      return `<path class="connection ${selected === from || selected === to ? "highlight" : ""}" d="M${ax} ${ay} V${mid} H${bx} V${by}" marker-end="url(#arrow)"/><text class="edge-label" x="${(ax + bx) / 2 + 6}" y="${mid - 7}">${esc(label)}</text>`;
    })
    .join("");
  host.innerHTML = `<div class="section-caption"><div><span class="dot green"></span> THE PLATFORM WORLD <span class="caption-sub">Click a place to open its story</span></div><label class="future-toggle"><input type="checkbox" id="future-toggle" ${showFuture ? "checked" : ""}/> Show future & legacy</label></div><div class="map-layout"><div class="map-viewport" id="map-viewport" aria-label="Interactive module map"><div class="map-legend"><span><i class="blue"></i>Identity & access</span><span><i class="green"></i>Core operations</span><span><i class="orange"></i>Transactions</span><span><i class="purple"></i>Insights</span></div><div class="map-world" id="map-world" style="transform:translate(${offset.x}px,${offset.y}px) scale(${zoom})"><svg class="map-lines" width="990" height="1480" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="#a1b6ac"/></marker></defs>${edges}</svg>${visible
    .map(
      (r) =>
        `<a href="#map?node=${r.id}" class="map-node ${r.color} ${selected === r.id ? "selected" : ""} ${r.status !== "MVP" ? "future-node" : ""}" style="left:${r.x}px;top:${r.y}px" aria-current="${selected === r.id ? "true" : "false"}"><div class="node-meta"><span class="node-number">${r.icon}</span><span>${r.status === "MVP" ? `${regionFiles(r.id).length} FILES` : r.status.toUpperCase()}</span><span class="node-arrow">↗</span></div><h3>${esc(r.title)}</h3><p>${esc(
          technical
            ? (regionFiles(r.id)
                .find((f) => f.role === "service")
                ?.path.split("/")
                .slice(-2)
                .join("/") ?? r.subtitle)
            : r.subtitle,
        )}</p><div class="node-bottom"><span class="node-dot"></span>${r.status === "MVP" ? "Implemented · review gaps remain" : r.status === "Legacy" ? "Isolated reference" : "Not implemented"}</div></a>`,
    )
    .join(
      "",
    )}<div class="map-boundary" style="top:1130px">${showFuture ? "Future and legacy are separate from the running MVP." : "The web UI calls NestJS; PostgreSQL stores the records."}</div></div><div class="map-controls"><button data-zoom="out" aria-label="Zoom out">−</button><span id="zoom-value">${Math.round(zoom * 100)}%</span><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="fit" aria-label="Fit map">⊡</button></div><div class="map-help">Drag the background to explore · select a card for details</div></div>${inspector(selected)}</div><div class="journey-banner"><span class="journey-icon">↳</span><div><strong>Not sure where to start?</strong><p>Follow a sale from the API entrance to the last stock movement.</p></div><a href="#workflows?flow=sale" class="button">Take the guided journey <span>→</span></a></div><p class="evidence-note">Map connections are a curated domain overview. File imports and controller routes are extracted from the source; they are not a runtime trace. Source fingerprint: <code>${atlas.fingerprint}</code>.</p>`;
  initPan();
}
function fileDetail(file: File) {
  const routes = atlas.endpoints.filter((e) => e.file === file.path);
  return `<div class="detail-title"><div>${pill(file.role)}<h2>${esc(short(file.path))}</h2><p>${esc(file.summary)}</p></div><span class="line-count">${file.lines} lines</span></div>${pathBox(file.path)}<div class="dependency-strip"><div><h3>Used by <span>${file.importedBy.length}</span></h3>${file.importedBy.map((p) => fileLink(p)).join("") || '<p class="muted">No local imports point here.<br/>May be an entry point.</p>'}</div><div class="dependency-center">→<strong>${esc(short(file.path))}</strong>→</div><div><h3>Depends on <span>${file.imports.length}</span></h3>${file.imports.map((p) => fileLink(p)).join("") || '<p class="muted">No local file imports.</p>'}</div></div>${file.tables.length ? `<h3>Table symbols referenced</h3><div class="chips">${file.tables.map(tableLink).join("")}</div><p class="hint">Static references, not proof that every operation reads or writes every table.</p>` : ""}${routes.length ? `<h3>Routes entering this file</h3>${routes.map((e) => `<a class="route-link" href="#api?route=${encodeURIComponent(e.id)}">${method(e.method)}<code>${esc(e.path)}</code><span>↗</span></a>`).join("")}` : ""}<h3>Methods & calls</h3><div class="methods">${file.methods.map((m) => `<details><summary><code>${esc(m.name)}()</code><span>line ${m.line} · ${m.calls.length} injected calls</span></summary><a class="source-link" href="${source(file.path, m.line)}" target="_blank" rel="noreferrer">Read method ↗</a>${m.calls.map((c) => `<div class="method-call">→ ${fileLink(c.file, `${short(c.file)} → ${c.method}()`)}</div>`).join("") || '<p class="muted">No directly injected service calls detected.</p>'}</details>`).join("") || '<p class="muted">No class methods. This file contains declarations, configuration or startup code.</p>'}</div><h3>External packages</h3><div class="chips">${file.packages.map((p) => pill(p)).join("")}</div>`;
}
function renderFiles(selected: string | null) {
  const file =
    fileByPath(selected ?? "") ??
    atlas.files.find((f) => f.path.endsWith("inventory.service.ts"))!;
  const frontend = atlas.repositoryFiles.filter((f) => f.path.startsWith("apps/web/src/"));
  host.innerHTML = `<div class="section-caption"><div>THE FILE EXPLORER <span class="caption-sub">Real paths. Real imports. Both directions.</span></div><span>${atlas.files.length} API · ${frontend.length} web files</span></div><div class="explorer-layout"><aside class="file-tree"><h3>apps / api / src</h3>${[
    ...new Set(atlas.files.map((f) => f.group)),
  ]
    .map(
      (g) =>
        `<details ${g === file.group ? "open" : ""}><summary><span>▸ ${g === "entry" ? "entry points" : esc(g)}</span><small>${regionFiles(g).length}</small></summary>${regionFiles(
          g,
        )
          .map(
            (f) =>
              `<a class="${file.path === f.path ? "selected" : ""}" href="#files?path=${encodeURIComponent(f.path)}"><span class="file-dot ${f.role}"></span>${esc(short(f.path))}</a>`,
          )
          .join("")}</details>`,
    )
    .join(
      "",
    )}<h3>apps / web / src</h3>${["app", "components", "features", "lib"].map((section) => `<details ${file.path.startsWith(`apps/web/src/${section}/`) ? "open" : ""}><summary><span>▸ ${section}</span><small>${frontend.filter((f) => f.path.startsWith(`apps/web/src/${section}/`)).length}</small></summary>${frontend.filter((f) => f.path.startsWith(`apps/web/src/${section}/`)).map((f) => `<a class="${file.path === f.path ? "selected" : ""}" href="#files?path=${encodeURIComponent(f.path)}"><span class="file-dot ${esc(f.role)}"></span>${esc(f.path.slice("apps/web/src/".length))}</a>`).join("")}</details>`).join("")}<div class="tree-note">API and web source imports are indexed at build time. Documentation, tests and infrastructure are described in the field guide.</div><a href="/read/codebase-map/" class="source-link">Full repository map ↗</a></aside><section class="file-detail">${fileDetail(file)}</section></div>`;
}
function fieldsFor(name: string): Atlas["dtos"][number]["fields"] {
  const dto = atlas.dtos.find((d) => d.name === name);
  return dto
    ? [...(dto.extends ? fieldsFor(dto.extends) : []), ...dto.fields]
    : [];
}
function renderApi(id: string | null) {
  const endpoint = atlas.endpoints.find((e) => e.id === id);
  host.innerHTML = `<div class="section-caption"><div>API DIRECTORY <span class="caption-sub">HTTP request → controller → service</span></div><a href="http://localhost:3000/api/docs" target="_blank" rel="noreferrer">Open local Swagger ↗</a></div><p class="hint">Read-only route reference. Try live requests in Swagger when the API is running on port 3000.</p>${
    endpoint
      ? `<section class="api-detail"><a class="back-link" href="#api">← All ${atlas.endpoints.length} routes</a><h2>${method(endpoint.method)} <code>${esc(endpoint.path)}</code></h2><div class="chips">${pill(endpoint.public ? "Public endpoint" : "Verified session required", endpoint.public ? "" : "live")}${pill(regionName(endpoint.group))}</div><p>${endpoint.public ? "This route bypasses the session guard. Individual authentication operations still apply their own checks." : "AuthGuard runs before the handler. Business and location permissions are checked in the called services; inspect them for the exact policy."}</p>${pathBox(endpoint.file, endpoint.line)}<h3>Trace this request</h3><div class="request-chain">${fileLink(endpoint.file, `Controller: ${endpoint.handler}()`)}${endpoint.calls.map((c) => `<span>→</span>${fileLink(c.file, `${short(c.file)}: ${c.method}()`)}`).join("")}</div><h3>Request body ${endpoint.body ? pill(endpoint.body) : ""}</h3>${
          endpoint.body
            ? `<table class="data-table"><thead><tr><th>Field</th><th>Type</th><th>Validation</th></tr></thead><tbody>${fieldsFor(
                endpoint.body,
              )
                .map(
                  (f) =>
                    `<tr><td><code>${esc(f.name)}</code><small>${f.optional ? "optional" : "required"}</small></td><td><code>${esc(f.type)}</code></td><td>${f.rules.map((r) => `<code class="validator">${esc(r)}</code>`).join("")}</td></tr>`,
                )
                .join(
                  "",
                )}</tbody></table><p class="hint">Nested DTO names refer to additional validation types in the linked DTO source. Authorization, status codes and response shapes should be checked in the source and Swagger.</p>`
            : '<p class="muted">No typed body on this handler. It may use route parameters, query parameters or cookies.</p>'
        }</section>`
      : `<div class="api-list">${[
          ...new Set(atlas.endpoints.map((e) => e.group)),
        ]
          .map(
            (g) =>
              `<section><h3>${esc(regionName(g))}<span>${atlas.endpoints.filter((e) => e.group === g).length} routes</span></h3>${atlas.endpoints
                .filter((e) => e.group === g)
                .map(
                  (e) =>
                    `<a class="route-link" href="#api?route=${encodeURIComponent(e.id)}">${method(e.method)}<code>${esc(e.path)}</code><span class="route-auth">${e.public ? "public" : "session"}</span><span>→</span></a>`,
                )
                .join("")}</section>`,
          )
          .join("")}</div>`
  }`;
}
function renderDatabase(id: string | null) {
  const table =
    atlas.tables.find((t) => t.id === id) ??
    atlas.tables.find((t) => t.id === "batches")!;
  const inbound = atlas.tables.filter((t) => t.references.includes(table.id));
  const files = atlas.files.filter((f) => f.tables.includes(table.id));
  host.innerHTML = `<div class="section-caption"><div>THE RECORD BOOK <span class="caption-sub">Select a table to trace its relationships</span></div><span>${atlas.tables.length} implemented tables</span></div><div class="database-layout"><div class="table-catalog">${atlas.tables.map((t) => `<a href="#database?table=${t.id}" class="table-card ${t.id === table.id ? "selected" : ""} ${table.references.includes(t.id) || inbound.some((x) => x.id === t.id) ? "connected" : ""}"><span class="table-icon">▱</span><div><strong>${esc(t.name)}</strong><small>${t.columns.length} columns · ${t.columns.some((c) => c.name === "businessId") ? "business-owned" : "identity / shared"}</small></div><span>↗</span></a>`).join("")}</div><section class="table-detail"><div class="eyebrow">SELECTED TABLE</div><h2>${esc(table.name)}</h2><div class="table-relations"><div><h3>Referenced by</h3><div class="chips">${inbound.map((t) => tableLink(t.id)).join("") || '<span class="muted">No table reference found</span>'}</div></div><div class="relation-arrow">↓</div><div class="table-current">${esc(table.name)}</div><div class="relation-arrow">↓</div><div><h3>References</h3><div class="chips">${table.references.map(tableLink).join("") || '<span class="muted">No outgoing table reference</span>'}</div></div></div><p class="hint">Arrows follow schema foreign-key references. Composite ownership constraints are visible in the source.</p><h3>Columns</h3><table class="data-table"><thead><tr><th>Name</th><th>Type helper</th><th>Required</th></tr></thead><tbody>${table.columns.map((c) => `<tr><td><code>${esc(c.name)}</code>${c.primary ? ' <span title="Primary key">⚿</span>' : ""}</td><td><code>${esc(c.type)}</code></td><td>${c.required ? "Yes" : "Nullable"}${c.defaulted ? " · default" : ""}</td></tr>`).join("")}</tbody></table><h3>Files using this table symbol</h3><div class="file-stack">${files.map((f) => fileLink(f.path)).join("")}</div>${pathBox(table.file, table.line)}</section></div>`;
}
function renderWorkflows(id: string | null, stepValue: string | null) {
  const flow = workflows.find((f) => f.id === id) ?? workflows[0];
  const index = Math.max(
      0,
      Math.min(Number(stepValue) || 0, flow.steps.length - 1),
    ),
    step = flow.steps[index];
  const path = "apps/api/src/" + step.file,
    file = fileByPath(path),
    methodLine = file?.methods.find((m) => m.name === step.method)?.line ?? 1;
  host.innerHTML = `<div class="section-caption"><div>GUIDED JOURNEYS <span class="caption-sub">One real operation, explained step by step</span></div><span>Illustration · no API requests are sent</span></div><div class="workflow-tabs">${workflows.map((f) => `<a href="#workflows?flow=${f.id}" class="${flow.id === f.id ? "selected" : ""}">${esc(f.title)}</a>`).join("")}</div><div class="journey-layout"><aside class="journey-steps"><span class="eyebrow">${flow.label}</span><h2>${esc(flow.title)}</h2><p>${esc(flow.description)}</p><ol>${flow.steps.map((s, i) => `<li><a href="#workflows?flow=${flow.id}&step=${i}" class="${index === i ? "selected" : ""} ${i < index ? "done" : ""}" ${index === i ? 'aria-current="step"' : ""}><span>${i < index ? "✓" : String(i + 1).padStart(2, "0")}</span><div>${esc(s.title)}<small>${esc(regionName(s.region))}</small></div></a></li>`).join("")}</ol></aside><section class="journey-stage"><div class="step-overline">STEP ${index + 1} OF ${flow.steps.length} <span>${esc(regionName(step.region))}</span></div><div class="journey-illustration"><div class="travel-line"></div><div class="travel-token">${index + 1}</div><span class="travel-dot a"></span><span class="travel-dot b"></span><div class="travel-label">${esc(technical ? (step.method ? step.method + "()" : short(path)) : step.title)}</div></div><h2>${esc(step.title)}</h2><p class="step-description">${esc(step.detail)}</p><div class="step-file"><span class="eyebrow">THIS HAPPENS HERE</span>${fileLink(path)}${pathBox(path, methodLine)}</div><div class="step-actions"><button class="button secondary" data-step="${index - 1}" data-flow="${flow.id}" ${index === 0 ? "disabled" : ""}>← Previous</button><span>${flow.steps.map((_, i) => `<i class="${i === index ? "active" : ""}"></i>`).join("")}</span>${index < flow.steps.length - 1 ? `<button class="button" data-step="${index + 1}" data-flow="${flow.id}">Next connection →</button>` : `<a class="button" href="#map?node=${step.region}">Explore on the map →</a>`}</div></section></div>`;
}
function renderDocs() {
  host.innerHTML = `<div class="section-caption"><div>THE FIELD GUIDE <span class="caption-sub">Read the decisions behind the map</span></div><span>${documents.length} reference pages</span></div><div class="document-grid">${documents.map((d) => `<a href="/read/${d.slug}/" class="document-card"><span class="eyebrow">${esc(d.category)}</span><h3>${esc(d.title.replace("Food Intelligence Platform — ", "").replace("Food Intelligence Platform - ", ""))}</h3><div>${pill(d.status)}<span>Read guide ↗</span></div></a>`).join("")}</div>`;
}
function renderRisks() {
  host.innerHTML = `<section class="risk-intro"><span class="eyebrow">KNOW THE LIMITS OF THE MAP</span><h2>Implemented does not mean fully hardened.</h2><p>These review findings remain open. This portal describes the current source; it does not repair backend behavior. The return inspection item requires a policy decision, while the others identify implementation gaps.</p></section><div class="risk-grid">${findings.map((f, i) => `<article class="risk-card"><span>REVIEW ${String(i + 1).padStart(2, "0")}</span><h3>${esc(f.title)}</h3><p>${esc(f.detail)}</p>${link("map", "node", f.region, `Explore ${regionName(f.region)} →`)}</article>`).join("")}</div><p class="evidence-note">Historical credential-like values also need classification and rotation if real. No credential values are included in this portal. This list reflects the preceding read-only review, not a fresh security certification.</p>`;
}
function render() {
  const { view, params } = state();
  const titles: Record<string, [string, string]> = {
    map: [
      "Know your platform.<br/><span>One connection at a time.</span>",
      "Explore the backend like a world map. Pick a place, follow a journey, or open a file to see the part it plays.",
    ],
    workflows: [
      "Follow the journey.<br/><span>Understand every handoff.</span>",
      "Walk through real backend workflows, from the first permission check to the final record.",
    ],
    files: [
      "Every file has a job.<br/><span>Find it. Follow it.</span>",
      "See what each file contributes, what it imports, and which other files depend on it.",
    ],
    api: [
      "Meet the entrances.<br/><span>Trace what happens next.</span>",
      "Explore implemented HTTP routes, request fields, controllers and their service calls.",
    ],
    database: [
      "See the record book.<br/><span>Connect the relationships.</span>",
      "Explore the implemented PostgreSQL tables and the files that reference them.",
    ],
    docs: [
      "The ideas behind the code.<br/><span>Your platform field guide.</span>",
      "Read the product rules, architecture decisions, setup instructions and lifecycle diagrams.",
    ],
    risks: [
      "Keep the gaps visible.<br/><span>Debug with the full picture.</span>",
      "Known limitations are part of the architecture. Know where the implementation still needs attention.",
    ],
  };
  const chosen = titles[view] ? view : "map";
  document.querySelector("#page-title")!.innerHTML = titles[chosen][0];
  document.querySelector("#page-description")!.textContent = titles[chosen][1];
  document.querySelector("#breadcrumb")!.textContent =
    chosen === "map"
      ? "Architecture"
      : chosen[0].toUpperCase() + chosen.slice(1);
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((n) => {
    n.classList.toggle("active", n.dataset.view === chosen);
    if (n.dataset.view === chosen) n.setAttribute("aria-current", "page");
    else n.removeAttribute("aria-current");
  });
  if (chosen === "map") renderMap(params.get("node") || "inventory");
  else if (chosen === "files") renderFiles(params.get("path"));
  else if (chosen === "api") renderApi(params.get("route"));
  else if (chosen === "database") renderDatabase(params.get("table"));
  else if (chosen === "workflows")
    renderWorkflows(params.get("flow"), params.get("step"));
  else if (chosen === "docs") renderDocs();
  else renderRisks();
}
function updateTransform() {
  const world = document.querySelector<HTMLElement>("#map-world");
  if (world)
    world.style.transform = `translate(${offset.x}px,${offset.y}px) scale(${zoom})`;
  const value = document.querySelector("#zoom-value");
  if (value) value.textContent = `${Math.round(zoom * 100)}%`;
}
function initPan() {
  const viewport = document.querySelector<HTMLElement>("#map-viewport")!;
  let drag: { x: number; y: number; ox: number; oy: number } | null = null;
  viewport.addEventListener("pointerdown", (e) => {
    if (
      (e.target as HTMLElement).closest("a,button,label,input") ||
      e.button !== 0
    )
      return;
    drag = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("dragging");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!drag) return;
    offset = {
      x: drag.ox + e.clientX - drag.x,
      y: drag.oy + e.clientY - drag.y,
    };
    updateTransform();
  });
  const end = () => {
    drag = null;
    viewport.classList.remove("dragging");
  };
  viewport.addEventListener("pointerup", end);
  viewport.addEventListener("pointercancel", end);
}
document.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  if (target.dataset.zoom) {
    if (target.dataset.zoom === "fit") {
      const width = document.querySelector("#map-viewport")!.clientWidth;
      zoom = Math.min(0.85, (width - 30) / 980);
      offset = { x: 0, y: 40 };
    } else
      zoom = Math.max(
        0.35,
        Math.min(1.4, zoom + (target.dataset.zoom === "in" ? 0.1 : -0.1)),
      );
    updateTransform();
  }
  if (target.dataset.step)
    location.hash = `workflows?flow=${target.dataset.flow}&step=${target.dataset.step}`;
  if (target.dataset.copy) {
    try {
      await navigator.clipboard.writeText(target.dataset.copy);
      const toast = document.querySelector<HTMLElement>("#toast")!;
      toast.textContent = "File path copied";
      toast.hidden = false;
      window.setTimeout(() => (toast.hidden = true), 1800);
    } catch {
      const toast = document.querySelector<HTMLElement>("#toast")!;
      toast.textContent = "Select the path above to copy it manually.";
      toast.hidden = false;
      window.setTimeout(() => (toast.hidden = true), 2500);
    }
  }
  if (target.id === "simple-mode" || target.id === "technical-mode") {
    technical = target.id === "technical-mode";
    for (const id of ["simple-mode", "technical-mode"]) {
      const b = document.getElementById(id)!;
      const active = (id === "technical-mode") === technical;
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", String(active));
    }
    render();
  }
});
document.addEventListener("change", (e) => {
  if ((e.target as HTMLElement).id === "future-toggle") {
    showFuture = (e.target as HTMLInputElement).checked;
    render();
  }
});
const search = document.querySelector<HTMLInputElement>("#search")!,
  results = document.querySelector<HTMLElement>("#search-results")!;
search.addEventListener("input", () => {
  query = search.value.trim().toLowerCase();
  results.hidden = !query;
  if (!query) return;
  const hits = [
    ...regions
      .filter((r) => `${r.title} ${r.story}`.toLowerCase().includes(query))
      .map((r) => ({
        href: `#map?node=${r.id}`,
        title: r.title,
        type: "Module",
      })),
    ...atlas.files
      .filter((f) => f.path.toLowerCase().includes(query))
      .map((f) => ({
        href: `#files?path=${encodeURIComponent(f.path)}`,
        title: f.path,
        type: "File",
      })),
    ...atlas.endpoints
      .filter((e) => e.id.toLowerCase().includes(query))
      .map((e) => ({
        href: `#api?route=${encodeURIComponent(e.id)}`,
        title: e.id,
        type: "API",
      })),
    ...atlas.tables
      .filter((t) => t.name.toLowerCase().includes(query))
      .map((t) => ({
        href: `#database?table=${t.id}`,
        title: t.name,
        type: "Table",
      })),
    ...documents
      .filter((d) => d.title.toLowerCase().includes(query))
      .map((d) => ({
        href: `/read/${d.slug}/`,
        title: d.title,
        type: "Guide",
      })),
  ];
  results.innerHTML = `<div class="search-summary">${hits.length} matches${hits.length > 24 ? " · showing first 24, refine your search" : ""}</div>${
    hits
      .slice(0, 24)
      .map(
        (h) =>
          `<a href="${h.href}">${pill(h.type)}<span>${esc(h.title)}</span><span>→</span></a>`,
      )
      .join("") ||
    "<p>No match. Try inventory, auth, orders, or a filename.</p>"
  }`;
});
results.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("a")) {
    results.hidden = true;
    search.value = "";
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !(e.target instanceof HTMLInputElement) &&
    !(e.target instanceof HTMLTextAreaElement)
  ) {
    e.preventDefault();
    search.focus();
  }
  if (e.key === "Escape") {
    results.hidden = true;
    search.value = "";
    search.blur();
  }
});
window.addEventListener("hashchange", render);
render();
