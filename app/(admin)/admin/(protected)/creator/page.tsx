import { Metadata } from "next";

import { CreatorManager } from "@/components/admin/creator-manager";

export const metadata: Metadata = {
  title: "Admin Creator System"
};

export default function AdminCreatorPage() {
  return <CreatorManager />;
}
