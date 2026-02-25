import { safeSocialLinks } from "@/lib/firestore/site-public";
import type { PublicPagePath } from "@/types/site-settings";

import { SiteFooterClient } from "@/components/site/site-footer-client";

export async function SiteFooter({ visibleRoutes }: { visibleRoutes: PublicPagePath[] }) {
  const socialLinks = await safeSocialLinks();

  return (
    <SiteFooterClient
      visibleRoutes={visibleRoutes}
      socialLinks={socialLinks.map((link) => ({
        label: link.label,
        url: link.url
      }))}
    />
  );
}
