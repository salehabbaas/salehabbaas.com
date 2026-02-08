import { safeGetSitemapEntries } from "@/lib/firestore/public";
import { resolveAbsoluteUrl } from "@/lib/utils";

export async function GET() {
  const items = await safeGetSitemapEntries();
  const now = new Date().toUTCString();

  const rssItems = items
    .map((item) => {
      const title = item.seoTitle || item.contentTitle;
      const description = item.seoDesc || item.hook || item.body.slice(0, 180);
      const url = resolveAbsoluteUrl(`/creator/${item.slug}`);
      const published = new Date(item.publishedAt || Date.now()).toUTCString();
      return `
        <item>
          <title><![CDATA[${title}]]></title>
          <link>${url}</link>
          <guid>${url}</guid>
          <pubDate>${published}</pubDate>
          <description><![CDATA[${description}]]></description>
        </item>
      `;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Saleh Abbaas Creator Feed</title>
    <link>${resolveAbsoluteUrl("/creator")}</link>
    <description>Public creator content from Saleh Abbaas.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
