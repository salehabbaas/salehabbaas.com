import { Metadata } from "next";

import { BookingsManager } from "@/components/admin/bookings-manager";

export const metadata: Metadata = {
  title: "Bookings"
};

export default function AdminBookingsPage() {
  return <BookingsManager />;
}
