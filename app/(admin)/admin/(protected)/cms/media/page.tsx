import type { Metadata } from "next";

import { CmsMediaManager } from "@/components/admin/cms/cms-media-manager";

export const metadata: Metadata = {
  title: "CMS Media"
};

export default function AdminCmsMediaPage() {
  return <CmsMediaManager />;
}
