import { Metadata } from "next";

import { CreatorManager } from "@/components/admin/creator-manager";

export const metadata: Metadata = {
  title: "Admin Creator System | Saleh Abbaas"
};

export default function AdminCreatorPage() {
  return <CreatorManager />;
}
