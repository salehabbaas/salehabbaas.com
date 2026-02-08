import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardSummary } from "@/lib/firestore/dashboard";

export default async function AdminOverviewPage() {
  const summary = await getAdminDashboardSummary();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Traffic, creator, booking, and job tracker overview.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Page Views (30d)</p>
            <p className="mt-2 text-2xl font-semibold">{summary.traffic.pageViews}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Creator Views</p>
            <p className="mt-2 text-2xl font-semibold">{summary.creator.views}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Upcoming Bookings</p>
            <p className="mt-2 text-2xl font-semibold">{summary.bookings.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Job Applications</p>
            <p className="mt-2 text-2xl font-semibold">{summary.jobs.total}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Based on tracked page_view events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summary.traffic.topPages.length ? (
              summary.traffic.topPages.map((page) => (
                <div key={page.path} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                  <span>{page.path}</span>
                  <span className="font-medium">{page.views}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No analytics data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage content, bookings, and integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href="/admin/cms" className="block rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
              Open CMS Management
            </Link>
            <Link href="/admin/creator" className="block rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
              Open Creator System
            </Link>
            <Link href="/admin/bookings" className="block rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
              Open Booking Management
            </Link>
            <Link href="/admin/job-tracker" className="block rounded-xl border border-border/70 bg-card/70 px-3 py-2 hover:border-primary">
              Open Job Tracker
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
