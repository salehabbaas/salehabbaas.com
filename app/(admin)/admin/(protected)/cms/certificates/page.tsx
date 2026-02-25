import type { Metadata } from "next";

import { CmsCertificatesPage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Certificates"
};

export default function AdminCmsCertificatesPage() {
  return <CmsCertificatesPage />;
}
