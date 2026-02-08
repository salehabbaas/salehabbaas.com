import { Metadata } from "next";

import { CmsManager } from "@/components/admin/cms-manager";

export const metadata: Metadata = {
  title: "CMS"
};

export default function AdminCmsPage() {
  return <CmsManager />;
}
