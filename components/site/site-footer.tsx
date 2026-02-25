import { safeSocialLinks } from "@/lib/firestore/site-public";
import type { PublicPageSettings } from "@/types/site-settings";

import { SiteFooterClient } from "@/components/site/site-footer-client";

export async function SiteFooter({ pageSettings }: { pageSettings: PublicPageSettings }) {
  const socialLinks = await safeSocialLinks();

  return (
    <SiteFooterClient
      pageSettings={pageSettings}
      socialLinks={socialLinks.map((link) => ({
        label: link.label,
        url: link.url
      }))}
    />
  );
}
