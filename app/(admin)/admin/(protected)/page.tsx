import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saleh Admin Control Center</CardTitle>
          <CardDescription>Manage creator content, job tracker workflows, and revalidation pipelines.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creator System</CardTitle>
            <CardDescription>Create platform variants, schedule posts, and maintain public SEO content pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/creator" className="text-sm font-medium text-primary hover:underline">
              Open Creator Admin
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Tracker</CardTitle>
            <CardDescription>Track application pipeline and export structured XLSX reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/jobs" className="text-sm font-medium text-primary hover:underline">
              Open Job Tracker
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
