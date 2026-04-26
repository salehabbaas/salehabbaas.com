import { PageViewTracker } from "@/components/site/page-view-tracker";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <PageViewTracker />
      {children}
    </div>
  );
}
