import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Website Stats Dashboard"
};

export default function AdminControlCenterPage() {
  redirect("/admin");
}
