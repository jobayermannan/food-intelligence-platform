import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, "../../..");
const slash = (s) => s.replaceAll("\\", "/");
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
const sourcePaths = walk(path.join(root, "apps/api/src"))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => slash(path.relative(root, p)))
  .sort();
const line = (node, source) =>
  source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
const decs = (n) =>
  ts.canHaveDecorators(n) ? (ts.getDecorators(n) ?? []) : [];
const decorator = (n, name) =>
  decs(n).find(
    (d) =>
      ts.isCallExpression(d.expression) &&
      d.expression.expression.getText() === name,
  )?.expression;
const arg = (call, i = 0) =>
  call?.arguments[i] && ts.isStringLiteral(call.arguments[i])
    ? call.arguments[i].text
    : "";
const visit = (node, fn) => {
  fn(node);
  ts.forEachChild(node, (n) => visit(n, fn));
};
const resolveImport = (file, ref) => {
  const base = slash(
    path.posix.normalize(path.posix.join(path.posix.dirname(file), ref)),
  );
  return [base + ".ts", base + "/index.ts"].find((p) =>
    sourcePaths.includes(p),
  );
};
const group = (p) =>
  p.startsWith("apps/api/src/")
    ? p.split("/")[3]?.includes(".")
      ? "entry"
      : p.split("/")[3]
    : p.startsWith("apps/docs/")
      ? "docs"
      : p.startsWith("legacy/")
        ? "legacy"
        : "infrastructure";
const role = (p) =>
  p.endsWith(".controller.ts")
    ? "controller"
    : p.endsWith(".service.ts")
      ? "service"
      : p.endsWith(".dto.ts")
        ? "validation"
        : p.endsWith(".module.ts")
          ? "module"
          : p.endsWith(".guard.ts")
            ? "guard"
            : p.endsWith("schema.ts")
              ? "schema"
              : "support";
const roleSummary = {
  controller:
    "The front desk: receives an HTTP request and passes it to the right service.",
  service:
    "The workshop: performs the operation and coordinates the rules and stored records.",
  validation:
    "The checklist: defines which request fields are accepted and how they are validated.",
  module: "The wiring: connects controllers, services, and their dependencies.",
  guard:
    "The entrance check: verifies a signed-in identity and active session.",
  schema:
    "The blueprint: defines tables, columns, constraints, and relationships.",
  support:
    "Supporting code used to start, configure, or connect the application.",
};
const files = [],
  endpoints = [],
  dtos = [],
  tables = [];
const texts = new Map();
for (const p of sourcePaths) {
  const text = fs.readFileSync(path.join(root, p), "utf8");
  texts.set(p, text);
  const source = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true);
  const imports = [],
    packages = [],
    methods = [],
    symbols = new Map();
  for (const s of source.statements)
    if (ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier)) {
      const ref = s.moduleSpecifier.text;
      if (ref.startsWith(".")) {
        const target = resolveImport(p, ref);
        if (!target) throw new Error(`Unresolved local import: ${p} -> ${ref}`);
        imports.push(target);
        const named = s.importClause?.namedBindings;
        if (named && ts.isNamedImports(named))
          for (const e of named.elements) symbols.set(e.name.text, target);
      } else packages.push(ref);
    }
  for (const s of source.statements)
    if (ts.isClassDeclaration(s)) {
      const constructor = s.members.find(ts.isConstructorDeclaration);
      const injected = new Map(
        (constructor?.parameters ?? []).map((p) => [
          p.name.getText(),
          p.type?.getText(),
        ]),
      );
      for (const member of s.members)
        if (ts.isMethodDeclaration(member)) {
          const calls = [];
          if (member.body)
            visit(member.body, (n) => {
              if (
                !ts.isCallExpression(n) ||
                !ts.isPropertyAccessExpression(n.expression)
              )
                return;
              const receiver = n.expression.expression.getText();
              if (receiver.startsWith("this.")) {
                const type = injected.get(receiver.slice(5));
                const target = symbols.get(type);
                if (target)
                  calls.push({ file: target, method: n.expression.name.text });
              }
            });
          const m = {
            name: member.name.getText(),
            line: line(member, source),
            calls: [
              ...new Map(calls.map((c) => [c.file + c.method, c])).values(),
            ],
          };
          methods.push(m);
          const http = ["Get", "Post", "Put", "Patch", "Delete"].find((v) =>
            decorator(member, v),
          );
          if (http) {
            const base = arg(decorator(s, "Controller"));
            const tail = arg(decorator(member, http));
            const url = "/" + [base, tail].filter(Boolean).join("/");
            const body = member.parameters.find((p) => decorator(p, "Body"));
            endpoints.push({
              id: `${http.toUpperCase()} ${url}`,
              method: http.toUpperCase(),
              path: url,
              file: p,
              line: m.line,
              handler: m.name,
              group: group(p),
              public: !!decorator(member, "Public") || !!decorator(s, "Public"),
              body: body?.type?.getText() ?? null,
              calls: m.calls,
            });
          }
        }
      if (p.endsWith(".dto.ts"))
        dtos.push({
          name: s.name?.text,
          file: p,
          extends:
            s.heritageClauses?.[0]?.types[0]?.expression.getText() ?? null,
          fields: s.members
            .filter(ts.isPropertyDeclaration)
            .map((m) => ({
              name: m.name.getText(),
              type: m.type?.getText() ?? "unknown",
              optional: !!decorator(m, "IsOptional") || !!m.questionToken,
              rules: decs(m).map((d) => d.expression.getText()),
            })),
        });
    }
  files.push({
    path: p,
    group: group(p),
    role: role(p),
    summary: roleSummary[role(p)],
    imports,
    packages: [...new Set(packages)],
    methods,
    lines: text.split("\n").length,
  });
  if (p.endsWith("/schema.ts"))
    for (const s of source.statements)
      if (ts.isVariableStatement(s))
        for (const d of s.declarationList.declarations) {
          if (
            !d.initializer ||
            !ts.isCallExpression(d.initializer) ||
            d.initializer.expression.getText() !== "pgTable"
          )
            continue;
          const call = d.initializer,
            obj = call.arguments[1];
          if (!ts.isObjectLiteralExpression(obj)) continue;
          const columns = obj.properties
            .filter(ts.isPropertyAssignment)
            .map((prop) => {
              const expr = prop.initializer.getText();
              return {
                name: prop.name.getText(),
                type: expr.match(/^(\w+)\(/)?.[1] ?? "unknown",
                required:
                  expr.includes(".notNull()") ||
                  expr.startsWith("id(") ||
                  expr.startsWith("created(") ||
                  expr.startsWith("updated("),
                primary: expr.startsWith("id("),
                defaulted: /\.default|^(id|created|updated)\(/.test(expr),
              };
            });
          const refs = new Set();
          visit(call, (n) => {
            if (ts.isPropertyAccessExpression(n) && n.name.text !== "notNull") {
              const receiver = n.expression.getText();
              if (/^[a-zA-Z]+$/.test(receiver) && receiver !== "t")
                refs.add(receiver);
            }
          });
          tables.push({
            id: d.name.getText(),
            name: arg(call),
            file: p,
            line: line(d, source),
            columns,
            references: [...refs],
          });
        }
}
for (const t of tables)
  t.references = t.references.filter(
    (r) => tables.some((other) => other.id === r) && r !== t.id,
  );
for (const f of files) {
  const source = texts.get(f.path);
  f.tables = f.path.endsWith("/schema.ts")
    ? []
    : tables
        .filter(
          (t) =>
            new RegExp(`\\b${t.id}\\b`).test(source) &&
            f.imports.some((i) => i.endsWith("/schema.ts")),
        )
        .map((t) => t.id);
  f.importedBy = files
    .filter((other) => other.imports.includes(f.path))
    .map((other) => other.path);
}
const repo = "https://github.com/jobayermannan/food-intelligence-platform";
let revision = "main";
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
} catch {}
// Only these reviewed repository areas are exposed, as names and descriptions, never contents.
const supportingDirs = [
  "apps/api/test",
  "apps/api/drizzle",
  "apps/web/src",
  "apps/web/test",
  "apps/docs/src",
  "apps/docs/scripts",
  "apps/docs/content",
  "apps/docs/public",
  "docker",
  ".github/workflows",
];
const supportingRoots = [
  "package.json",
  "README.md",
  "PRODUCT_DOMAIN.md",
  "STACK_DECISION.md",
  "DATABASE_DESIGN.md",
  "API_USER_FLOW.md",
  "CODEBASE_MAP.md",
  "BACKEND_AUDIT.md",
  "MIGRATION_PLAN.md",
  "CHANGE_IMPACT_MAP.md",
  "AGENTIC_DEVELOPMENT_GUIDE.md",
  "USER_MANUAL.md",
  "UPGRADE_GUIDE.md",
  "docker-compose.yml",
  "apps/api/package.json",
  "apps/api/drizzle.config.ts",
  "apps/api/tsconfig.json",
  "apps/api/tsconfig.build.json",
  "apps/api/jest.config.cjs",
  "apps/api/eslint.config.mjs",
  "apps/docs/package.json",
  "apps/docs/astro.config.mjs",
  "apps/docs/tsconfig.json",
  "apps/docs/README.md",
  "apps/web/package.json",
  "apps/web/next.config.ts",
  "apps/web/tsconfig.json",
  "legacy/index.js",
  "legacy/package.json",
];
const supportingPaths = [
  ...new Set([
    ...supportingRoots,
    ...supportingDirs.flatMap((d) =>
      fs.existsSync(path.join(root, d))
        ? walk(path.join(root, d)).map((p) => slash(path.relative(root, p)))
        : [],
    ),
  ]),
].filter(
  (p) =>
    fs.existsSync(path.join(root, p)) &&
    !p.endsWith("/generated.json") &&
    /\.(md|ts|tsx|mjs|cjs|json|css|astro|sql|svg|yml|js)$/.test(p),
);
let committed = [];
try {
  committed = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n");
} catch {}
const repositoryFiles = supportingPaths.sort().map((p) => ({
  path: p,
  group: p.startsWith("apps/web/src/")
    ? "frontend"
    : p.startsWith("apps/docs/")
    ? "docs"
    : p.includes("/test/")
      ? "testing"
      : p.includes("/drizzle/")
        ? "migrations"
        : p.startsWith("legacy/")
          ? "legacy"
          : p.endsWith(".md")
            ? "design"
            : "infrastructure",
  role: p.startsWith("apps/web/src/features/")
    ? "feature"
    : p.startsWith("apps/web/src/components/")
      ? "component"
      : p.startsWith("apps/web/src/lib/")
        ? "client contract"
        : p.endsWith(".sql")
    ? "migration"
    : p.endsWith(".md")
      ? "documentation"
      : p.endsWith(".spec.ts")
        ? "test"
        : "support",
  summary: p.startsWith("legacy/")
    ? "Historical Express/MongoDB reference. Not imported by Backend 2.0."
    : p.startsWith("apps/web/src/features/")
      ? `Next.js product screen for ${path.basename(p, path.extname(p))}; reads scoped API data and offers role-appropriate actions.`
      : p.startsWith("apps/web/src/components/")
        ? "Shared browser UI, session or business/location context for product workflows."
        : p.startsWith("apps/web/src/lib/")
          ? "Typed client contract, API request/session behavior, or exact display calculations."
          : p.startsWith("apps/web/src/app/")
            ? "Next.js product route or layout. The NestJS API owns business validation and data writes."
    : p.includes("/drizzle/")
      ? "Versioned database migration or Drizzle snapshot. Describes a database change; the portal never executes it."
      : p.includes("/test/")
        ? "Integration coverage for the API. Uses an isolated PostgreSQL test database."
        : p.startsWith("apps/docs/src/pages/")
          ? "Static Astro page for this documentation portal. No backend operations or database connection."
          : p.startsWith("apps/docs/src/scripts/")
            ? "Browser interaction for the architecture explorer: navigation, search and connected views."
            : p.startsWith("apps/docs/scripts/")
              ? "Build-time source indexing or portal validation. Reads allowlisted files without executing API code."
              : p.startsWith("apps/docs/content/") || p.endsWith(".md")
                ? "Reviewed documentation explaining product decisions, workflows, setup or deferred architecture."
                : p.startsWith(".github/")
                  ? "GitHub Actions quality checks. Runs on pushes and pull requests."
                  : p.startsWith("docker/") || p === "docker-compose.yml"
                    ? "Local development infrastructure for the API, PostgreSQL and Mailpit."
                    : p.includes("package.json")
                      ? "Workspace dependencies and commands."
                      : "Supporting configuration or presentation for the platform.",
  imports: [],
  importedBy: [],
  packages: [],
  methods: [],
  tables: [],
  lines: fs.readFileSync(path.join(root, p), "utf8").split("\n").length,
  sourceAvailable: committed.includes(p),
}));
// Resolve only local frontend source imports. The portal indexes metadata, never executes app code.
const webFiles = repositoryFiles.filter((f) => f.path.startsWith("apps/web/src/"));
const webPaths = new Set(webFiles.map((f) => f.path));
for (const file of webFiles) {
  if (!/\.tsx?$/.test(file.path)) continue;
  const code = fs.readFileSync(path.join(root, file.path), "utf8");
  const source = ts.createSourceFile(file.path, code, ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const ref = statement.moduleSpecifier.text;
    const base = ref.startsWith("@/")
      ? `apps/web/src/${ref.slice(2)}`
      : ref.startsWith(".")
        ? slash(path.posix.normalize(path.posix.join(path.posix.dirname(file.path), ref)))
        : "";
    const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.css`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => webPaths.has(candidate));
    if (target && target !== file.path && !file.imports.includes(target)) file.imports.push(target);
  }
}
for (const file of webFiles) for (const dependency of file.imports) {
  repositoryFiles.find((f) => f.path === dependency)?.importedBy.push(file.path);
}
for (const f of files) f.sourceAvailable = committed.includes(f.path);
const manifest = {
  revision,
  repo,
  fingerprint: createHash("sha256")
    .update([...texts.values(), ...webFiles.map((file) => fs.readFileSync(path.join(root, file.path), "utf8"))].join("\n"))
    .digest("hex")
    .slice(0, 12),
  files,
  repositoryFiles,
  endpoints,
  dtos,
  tables,
};
const output = path.resolve(here, "../src/data/generated.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Atlas: ${files.length} API files · ${endpoints.length} routes · ${tables.length} tables · ${manifest.fingerprint}`,
);
