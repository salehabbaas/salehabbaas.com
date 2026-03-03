import { Metadata } from "next";

import { BookingsManager } from "@/components/admin/bookings-manager";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Bookings"
};

export default async function AdminBookingsPage() {
  await requireAdminSession("bookings");
  return <BookingsManager />;
}
