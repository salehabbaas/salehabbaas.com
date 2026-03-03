import { AdminPageLoading } from "@/components/admin/admin-page-loading";

export default function AdminRootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <AdminPageLoading label="Loading..." />
      </div>
    </div>
  );
}
