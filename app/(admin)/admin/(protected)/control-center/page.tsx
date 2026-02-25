import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Control Center"
};

export default async function AdminControlCenterPage() {
  redirect("/admin");
}
