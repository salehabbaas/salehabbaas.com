import type { Metadata } from "next";

import { CmsProjectsPage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Projects"
};

export default function AdminCmsProjectsPage() {
  return <CmsProjectsPage />;
}
