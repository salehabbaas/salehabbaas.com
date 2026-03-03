import type { Metadata } from "next";

import { CmsExperiencePage } from "@/components/admin/cms/cms-section-pages";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "CMS Experience"
};

export default async function AdminCmsExperiencePage() {
  await requireAdminSession();
  return <CmsExperiencePage />;
}
