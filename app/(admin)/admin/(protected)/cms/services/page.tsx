import type { Metadata } from "next";

import { CmsServicesPage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Services"
};

export default function AdminCmsServicesPage() {
  return <CmsServicesPage />;
}
