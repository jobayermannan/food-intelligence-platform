import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
const files = walk(dist),
  pages = files.filter((f) => f.endsWith(".html"));
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  for (const [, url] of html.matchAll(/(?:href|src)="(\/(?!\/)[^"#?]*)/g)) {
    const target = path.join(dist, decodeURIComponent(url));
    assert.ok(fs.existsSync(target), `Broken local link ${url} in ${file}`);
    if (url.endsWith("/"))
      assert.ok(fs.existsSync(path.join(target, "index.html")));
  }
}
assert.ok(
  pages.length >= 36,
  "Expected the atlas plus all reviewed documentation pages",
);
assert.ok(
  !files.some((f) =>
    /(?:^|[\\/])\.env|legacy[\\/]index\.js|[\\/]schema\.ts$/.test(f),
  ),
  "Forbidden source artifact",
);
console.log(
  `Verified ${pages.length} static pages and their local asset/document links.`,
);
