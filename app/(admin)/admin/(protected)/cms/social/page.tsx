import type { Metadata } from "next";

import { CmsSocialPage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Social"
};

export default function AdminCmsSocialPage() {
  return <CmsSocialPage />;
}
