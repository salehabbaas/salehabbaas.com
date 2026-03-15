import { redirect } from "next/navigation";

export default async function AdminGoalsAddPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const dateRaw = Array.isArray(params.date) ? params.date[0] : params.date;
  const fromRaw = Array.isArray(params.from) ? params.from[0] : params.from;

  const query = new URLSearchParams();
  if (dateRaw) query.set("date", dateRaw);
  if (fromRaw) query.set("from", fromRaw);
  query.set("mode", "add");

  redirect(`/admin/goals/today${query.toString() ? `?${query.toString()}` : ""}`);
}
