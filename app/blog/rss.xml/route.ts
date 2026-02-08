import { getBlogPosts } from "@/lib/firestore/cms";
import { resolveAbsoluteUrl } from "@/lib/utils";

export async function GET() {
  const posts = await getBlogPosts({ publishedOnly: true });
  const now = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const link = resolveAbsoluteUrl(`/knowledge/${post.slug}`);
      return `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${link}</link>
        <guid>${link}</guid>
        <pubDate>${new Date(post.publishedAt || Date.now()).toUTCString()}</pubDate>
        <description><![CDATA[${post.excerpt}]]></description>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Saleh Abbaas Blog</title>
    <link>${resolveAbsoluteUrl("/knowledge")}</link>
    <description>Knowledge and blog content by Saleh Abbaas.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
