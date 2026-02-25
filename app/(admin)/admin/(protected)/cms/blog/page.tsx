import type { Metadata } from "next";

import { CmsBlogPage } from "@/components/admin/cms/cms-section-pages";

export const metadata: Metadata = {
  title: "CMS Blog"
};

export default function AdminCmsBlogPage() {
  return <CmsBlogPage />;
}
