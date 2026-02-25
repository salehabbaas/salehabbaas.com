import type { Metadata } from "next";

import { CmsProfileManager } from "@/components/admin/cms/cms-profile-manager";

export const metadata: Metadata = {
  title: "CMS Profile"
};

export default function AdminCmsProfilePage() {
  return <CmsProfileManager />;
}
