const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function checkMetadataFile(relativePath, routeLabel) {
  const source = read(relativePath);
  assert(source.includes("buildPageMetadata({"), `${routeLabel}: missing buildPageMetadata call (${relativePath})`);
  assert(source.includes("title:"), `${routeLabel}: missing metadata title (${relativePath})`);
  assert(source.includes("description:"), `${routeLabel}: missing metadata description (${relativePath})`);
  assert(source.includes("path:"), `${routeLabel}: missing metadata canonical path (${relativePath})`);
}

function checkDynamicMetadataFile(relativePath, routeLabel) {
  const source = read(relativePath);
  assert(source.includes("generateMetadata"), `${routeLabel}: missing generateMetadata (${relativePath})`);
  assert(source.includes("buildPageMetadata("), `${routeLabel}: missing buildPageMetadata (${relativePath})`);
}

function checkRobotsFile() {
  const robotsSource = read("public/robots.txt");
  const allowed = new Set(["user-agent", "allow", "disallow", "sitemap"]);

  assert(!/content-signal\s*:/i.test(robotsSource), "robots.txt: contains forbidden Content-Signal directive");
  assert(/Sitemap:\s*https:\/\/salehabbaas\.com\/sitemap\.xml/i.test(robotsSource), "robots.txt: missing canonical sitemap reference");

  const lines = robotsSource.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Za-z-]+)\s*:\s*(.+)$/);
    assert(Boolean(match), `robots.txt:${index + 1} invalid robots line format`);
    if (!match) return;

    const directive = match[1].toLowerCase();
    assert(allowed.has(directive), `robots.txt:${index + 1} unknown directive "${match[1]}"`);
  });
}

const staticMetadataChecks = [
  ["/", "app/(public)/page.tsx"],
  ["/about", "app/(public)/about/page.tsx"],
  ["/services", "app/(public)/services/page.tsx"],
  ["/projects", "app/(public)/projects/page.tsx"],
  ["/blog", "app/(public)/blog/page.tsx"],
  ["/contact", "app/(public)/contact/page.tsx"],
  ["/experience", "app/(public)/experience/page.tsx"],
  ["/ai-news", "app/(public)/ai-news/page.tsx"],
  ["/book-meeting", "app/(public)/book-meeting/page.tsx"],
  ["/certificates", "app/(public)/certificates/page.tsx"],
  ["/creator", "app/(public)/creator/page.tsx"],
  ["/public-statement", "app/(public)/public-statement/page.tsx"]
];

for (const [routeLabel, relativePath] of staticMetadataChecks) {
  checkMetadataFile(relativePath, routeLabel);
}

const dynamicMetadataChecks = [
  ["/projects/[slug]", "app/(public)/projects/[slug]/page.tsx"],
  ["/blog/[slug]", "app/(public)/blog/[slug]/page.tsx"],
  ["/creator/[slug]", "app/(public)/creator/[slug]/page.tsx"]
];

for (const [routeLabel, relativePath] of dynamicMetadataChecks) {
  checkDynamicMetadataFile(relativePath, routeLabel);
}

const metadataBuilderSource = read("lib/seo/metadata.ts");
assert(metadataBuilderSource.includes("alternates"), "buildPageMetadata: missing alternates block");
assert(metadataBuilderSource.includes("canonical"), "buildPageMetadata: missing canonical field");

const sitemapSource = read("app/sitemap.ts");
const expectedSitemapRoutes = [
  "/",
  "/about",
  "/experience",
  "/services",
  "/projects",
  "/blog",
  "/ai-news",
  "/creator",
  "/contact",
  "/public-statement",
  "/llms.txt"
];
for (const route of expectedSitemapRoutes) {
  assert(sitemapSource.includes(`"${route}"`), `sitemap: missing route ${route}`);
}
assert(sitemapSource.includes("/blog/${post.slug}"), "sitemap: missing blog dynamic entries");
assert(sitemapSource.includes("/projects/${project.slug}"), "sitemap: missing project dynamic entries");
assert(sitemapSource.includes("/creator/${entry.slug}"), "sitemap: missing creator dynamic entries");

checkRobotsFile();

assert(fs.existsSync(path.join(root, "public", "site.webmanifest")), "site.webmanifest: file missing");
assert(fs.existsSync(path.join(root, "public", "og-image.png")), "og-image.png: file missing");
assert(fs.existsSync(path.join(root, "public", "humans.txt")), "humans.txt: file missing");

if (failures.length) {
  console.error("SEO checks failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("SEO checks passed.");
