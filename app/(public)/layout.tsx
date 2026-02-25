import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageViewTracker } from "@/components/site/page-view-tracker";
import { PageTransition } from "@/components/motion/PageTransition";
import { PrismBackground } from "@/components/site/prism-background";
import { safePageVisibility } from "@/lib/firestore/page-visibility";
import type { PublicPagePath } from "@/types/site-settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const visibility = await safePageVisibility();
  const visibleRoutes = Object.entries(visibility)
    .filter(([, enabled]) => enabled)
    .map(([path]) => path as PublicPagePath);

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <PrismBackground />
      <div className="relative z-10">
        <PageViewTracker />
        <SiteHeader visibleRoutes={visibleRoutes} />
        <main id="main" className="min-h-[70vh]">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter visibleRoutes={visibleRoutes} />
      </div>
    </div>
  );
}
