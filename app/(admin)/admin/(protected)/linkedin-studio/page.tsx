import type { Metadata } from "next";

import { LinkedinStudioManager } from "@/components/admin/linkedin-studio-manager";

export const metadata: Metadata = {
  title: "LinkedIn Studio"
};

export default function AdminLinkedinStudioPage() {
  return <LinkedinStudioManager />;
}
