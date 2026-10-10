import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { workflows, regions, mapEdges } from "../src/data/guide.ts";

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(docs, "../..");
const atlas = JSON.parse(
  fs.readFileSync(path.join(docs, "src/data/generated.json"), "utf8"),
);
test("route extraction captures real public and guarded handlers and service calls", () => {
  const sale = atlas.endpoints.find(
    (e) => e.id === "POST /api/v1/businesses/:businessId/orders",
  );
  assert.equal(sale.body, "CreateSaleDto");
  assert.equal(sale.public, false);
  assert.ok(
    sale.calls.some(
      (c) => c.method === "sell" && c.file.endsWith("/sales.service.ts"),
    ),
  );
  assert.equal(
    atlas.endpoints.find((e) => e.id === "POST /api/v1/auth/register").public,
    true,
  );
  assert.equal(
    atlas.endpoints.find((e) => e.id === "GET /health/ready").public,
    true,
  );
  assert.equal(
    new Set(atlas.endpoints.map((e) => e.id)).size,
    atlas.endpoints.length,
  );
});
test("all source dependencies and line references resolve, including reverse edges", () => {
  for (const file of atlas.files) {
    assert.ok(fs.existsSync(path.join(root, file.path)), file.path);
    for (const dep of file.imports) {
      assert.ok(
        atlas.files.find((f) => f.path === dep)?.importedBy.includes(file.path),
        `${file.path} -> ${dep}`,
      );
    }
    for (const m of file.methods) {
      assert.ok(m.line > 0 && m.line <= file.lines);
      for (const call of m.calls) {
        assert.ok(
          atlas.files
            .find((f) => f.path === call.file)
            ?.methods.some((method) => method.name === call.method),
          `${call.file}.${call.method}`,
        );
      }
    }
  }
});
test("schema includes single-column and composite ownership references", () => {
  assert.equal(atlas.tables.length, 22);
  const batches = atlas.tables.find((t) => t.id === "batches");
  assert.ok(batches.references.includes("inventory"));
  assert.ok(batches.references.includes("suppliers"));
  assert.ok(
    atlas.tables.find((t) => t.id === "sessions").references.includes("users"),
  );
  assert.ok(batches.columns.some((c) => c.name === "remaining" && c.required));
});
test("frontend files and their local imports are visible in the repository map", () => {
  const dashboard = atlas.repositoryFiles.find((file) => file.path === "apps/web/src/features/dashboard.tsx");
  assert.ok(dashboard);
  assert.ok(dashboard.imports.includes("apps/web/src/components/workspace.tsx"));
  const workspace = atlas.repositoryFiles.find((file) => file.path === "apps/web/src/components/workspace.tsx");
  assert.ok(workspace.importedBy.includes(dashboard.path));
});
test("every guided step names a real source file and method", () => {
  for (const flow of workflows)
    for (const step of flow.steps) {
      const file = atlas.files.find(
        (f) => f.path === "apps/api/src/" + step.file,
      );
      assert.ok(file, step.file);
      if (step.method)
        assert.ok(
          file.methods.some((m) => m.name === step.method),
          step.method,
        );
      assert.ok(regions.some((r) => r.id === step.region));
    }
  for (const edge of mapEdges)
    for (const id of edge.slice(0, 2))
      assert.ok(regions.some((r) => r.id === id));
});
test("manifest is metadata only and never reads environment, legacy, or customer data", () => {
  for (const f of atlas.files) {
    assert.ok(f.path.startsWith("apps/api/src/") && f.path.endsWith(".ts"));
    assert.equal(f.content, undefined);
    assert.equal(f.source, undefined);
  }
  const raw = JSON.stringify(atlas);
  assert.ok(!raw.includes("postgres://"));
  assert.ok(!raw.includes("mongodb+srv://"));
  const envFile = path.join(root, ".env");
  if (fs.existsSync(envFile)) {
    const secret = fs
      .readFileSync(envFile, "utf8")
      .match(/^JWT_SECRET=(.+)$/m)?.[1]
      .trim();
    if (secret)
      assert.ok(!raw.includes(secret), "local secret must not be in the index");
  }
});
test("DTO metadata preserves required fields and inherited action token fields", () => {
  assert.ok(
    atlas.dtos
      .find((d) => d.name === "RegisterDto")
      .fields.some(
        (f) => f.name === "password" && f.rules.includes("MinLength(12)"),
      ),
  );
  assert.equal(
    atlas.dtos.find((d) => d.name === "ResetDto").extends,
    "TokenDto",
  );
});
