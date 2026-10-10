import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import atlas from "../data/generated.json";

// npm workspace scripts run Astro with apps/docs as the working directory.
// import.meta.url changes after prerender bundling, so do not use it for repo paths.
const root = path.resolve(process.cwd(), "../..");
const references = [
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
];
const topics = [
  "overview",
  "architecture",
  "setup",
  "backend",
  "database",
  "api",
  "inventory",
  "sales",
  "waste",
  "expiry",
  "discounts",
  "payments",
  "realtime",
  "jobs",
  "analytics",
  "ml",
  "testing",
  "deployment",
  "security",
  "maintenance",
  "agents",
  "upgrades",
];
const entries = [
  ...references.map((file) => ({
    file,
    slug: file.replace(".md", "").toLowerCase().replaceAll("_", "-"),
    category: "Reference",
  })),
  ...topics.map((topic) => ({
    file: `apps/docs/content/${topic}/index.md`,
    slug: `topic-${topic}`,
    category: "Guide",
  })),
  {
    file: "apps/docs/content/architecture/diagrams.md",
    slug: "diagrams",
    category: "Diagrams",
  },
];
const byFile = new Map(entries.map((e) => [e.file, e.slug]));
export const documents = entries.map((entry) => {
  const raw = fs.readFileSync(path.join(root, entry.file), "utf8");
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (entry.category !== "Reference" && !front)
    throw new Error(`Missing topic frontmatter: ${entry.file}`);
  const body = front ? raw.slice(front[0].length) : raw;
  const title =
    front?.[1].match(/^title:\s*(.+)$/m)?.[1].trim() ??
    body.match(/^#\s+(.+)$/m)?.[1] ??
    entry.slug;
  const html = sanitizeHtml(marked.parse(body, { async: false }), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      code: ["class"],
      a: ["href", "title"],
      img: ["src", "alt"],
    },
    transformTags: {
      a: (_tag, attrs) => {
        let href = attrs.href ?? "";
        if (href && !/^(https?:|mailto:|#)/.test(href)) {
          const [ref] = href.split("#");
          const resolved = path.posix.normalize(
            path.posix.join(path.posix.dirname(entry.file), ref),
          );
          href = byFile.has(resolved)
            ? `/read/${byFile.get(resolved)}/`
            : `${atlas.repo}/blob/${atlas.revision}/${resolved}`;
          // Markdown heading slugs are not retained; open the correct document rather than a broken fragment.
        }
        return { tagName: "a", attribs: { ...attrs, href } };
      },
    },
  });
  return {
    ...entry,
    title,
    html,
    status:
      front?.[1].match(/^status:\s*(.+)$/m)?.[1].trim() ??
      "Canonical reference",
  };
});
