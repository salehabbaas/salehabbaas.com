import { safeSocialLinks } from "@/lib/firestore/site-public";

import { SiteFooterClient } from "@/components/site/site-footer-client";

export async function SiteFooter() {
  const socialLinks = await safeSocialLinks();

  return (
    <SiteFooterClient
      socialLinks={socialLinks.map((link) => ({
        label: link.label,
        url: link.url
      }))}
    />
  );
}
