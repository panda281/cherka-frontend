import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://www.ticketr-events.com").replace(/\/+$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

function slugifyEventName(name = "") {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function eventPath(event) {
  return `/event/${slugifyEventName(event.name)}--${event.id}`;
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchPublishedEvents() {
  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) return [];
    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.filter((e) => e && e.status === "published" && e.id && e.name);
  } catch {
    return [];
  }
}

async function generate() {
  const events = await fetchPublishedEvents();
  const now = new Date().toISOString();

  const urls = [
    {
      loc: `${SITE_URL}/`,
      changefreq: "daily",
      priority: "1.0",
      lastmod: now
    },
    ...events.map((event) => ({
      loc: `${SITE_URL}${eventPath(event)}`,
      changefreq: "daily",
      priority: "0.8",
      lastmod: event.updatedAt || event.startsAt || now
    }))
  ];

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${xmlEscape(new Date(u.lastmod).toISOString())}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  const outputPath = resolve(process.cwd(), "public", "sitemap.xml");
  await writeFile(outputPath, content, "utf8");
  console.log(`Generated sitemap with ${urls.length} URLs -> ${outputPath}`);
}

generate();
