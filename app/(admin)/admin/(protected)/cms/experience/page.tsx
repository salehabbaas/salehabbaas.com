import type { Metadata } from "next";

import { CmsExperiencePage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Experience"
};

export default function AdminCmsExperiencePage() {
  return <CmsExperiencePage />;
}
