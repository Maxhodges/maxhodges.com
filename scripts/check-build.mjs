// Build-output checks for the design/perf overhaul. Run after `pnpm build`:
//   node scripts/check-build.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist", import.meta.url).pathname;
const failures = [];
const check = (name, ok, detail = "") => {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const read = (p) => readFileSync(join(dist, p), "utf8");

// --- gather files ---
const index = read("index.html");
const galleryDirs = readdirSync(join(dist, "gallery"));
const gallerySlug = galleryDirs.includes("kabukicho")
  ? "kabukicho"
  : galleryDirs[0];
const galleryHtml = read(`gallery/${gallerySlug}/index.html`);
const blogIndex = read("blog/index.html");
const blogDirs = readdirSync(join(dist, "blog")).filter(
  (d) => !d.includes("."),
);
const blogPost = read(`blog/${blogDirs[0]}/index.html`);
const cssFiles = readdirSync(join(dist, "_astro")).filter((f) =>
  f.endsWith(".css"),
);
const allCss = cssFiles.map((f) => read(`_astro/${f}`)).join("\n");

// --- 1. Fonts: self-hosted, no render-blocking Google Fonts chain ---
check(
  "no Google Fonts import in CSS",
  !allCss.includes("fonts.googleapis.com"),
);
check(
  "no Google Fonts link in HTML",
  !index.includes("fonts.googleapis.com") &&
    !index.includes("fonts.gstatic.com"),
);
check(
  "self-hosted font files shipped",
  readdirSync(join(dist, "_astro")).some((f) => f.endsWith(".woff2")),
);

// --- 2. LCP: above-the-fold images start from HTML with high priority ---
check(
  "home page has a fetchpriority=high image",
  index.includes('fetchpriority="high"'),
);
check(
  "gallery page has a fetchpriority=high image",
  galleryHtml.includes('fetchpriority="high"'),
);
check(
  "blog post hero is not lazy (eager LCP)",
  blogPost.includes('fetchpriority="high"'),
);

// --- 3. Admin contact-sheet is off the public gallery pages ---
check(
  "no raw-YAML admin payload on public gallery page",
  !galleryHtml.includes("data-yaml-output") &&
    !galleryHtml.includes("data-raw-yaml"),
);
check(
  "gridview still reachable (edit route exists)",
  existsSync(join(dist, "gallery", gallerySlug, "edit", "index.html")),
);
if (existsSync(join(dist, "gallery", gallerySlug, "edit", "index.html"))) {
  const editHtml = read(`gallery/${gallerySlug}/edit/index.html`);
  check(
    "edit route carries the contact sheet + yaml tool",
    editHtml.includes("data-yaml-output"),
  );
  check("edit route is noindex", editHtml.includes("noindex"));
} else {
  check("edit route carries the contact sheet + yaml tool", false, "no route");
  check("edit route is noindex", false, "no route");
}

// --- 4. SEO / social meta ---
for (const [name, html] of [
  ["home", index],
  ["gallery", galleryHtml],
  ["blog post", blogPost],
]) {
  check(`${name}: og:title`, html.includes('property="og:title"'));
  check(
    `${name}: og:image is absolute`,
    /property="og:image"\s+content="https?:\/\//.test(html) ||
      /content="https?:\/\/[^"]*"\s+property="og:image"/.test(html),
  );
  check(`${name}: canonical`, html.includes('rel="canonical"'));
  check(
    `${name}: specific description`,
    html.includes('name="description"') &&
      !html.includes("High-performance photography portfolio."),
  );
}
check("sitemap generated", existsSync(join(dist, "sitemap-index.xml")));
check("robots.txt shipped", existsSync(join(dist, "robots.txt")));

// --- 5. Caching ---
check(
  "_headers with immutable caching for hashed assets",
  existsSync(join(dist, "_headers")) && read("_headers").includes("immutable"),
);

// --- 6. Perf footguns removed ---
// Match actual declarations (a blur effect), not property names inside
// Tailwind's transition-property lists.
check(
  "no backdrop-filter effect in CSS",
  !/(?:^|[;{])\s*(?:-webkit-)?backdrop-filter\s*:/.test(allCss),
);

// --- 7. Gallery descriptions surfaced ---
check(
  "gallery description rendered on home page",
  index.includes("sleepless town"),
);

// --- 8. Scrollable gallery + PhotoSwipe lightbox ---
const photoCount = (galleryHtml.match(/<img\s/g) ?? []).length;
check(
  "gallery photos server-rendered in scrollable page",
  photoCount >= 9,
  `found ${photoCount} imgs`,
);
check(
  "photos wired for PhotoSwipe (data-pswp-width)",
  galleryHtml.includes("data-pswp-width"),
);
check(
  "lightbox deep-link filenames present",
  galleryHtml.includes("data-filename"),
);
check("photoswipe styles bundled", allCss.includes(".pswp"));
check(
  "gallery description shown on gallery page",
  galleryHtml.includes("sleepless town"),
);
check(
  "no leftover Svelte island on gallery page",
  !galleryHtml.includes("astro-island"),
);

// --- 9. Existing behavior preserved ---
check("blog index renders posts", blogIndex.includes("Nick Knight"));

console.log("");
if (failures.length) {
  console.error(`${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("All checks passed.");
