import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageViewTracker } from "@/components/site/page-view-tracker";
import { PageTransition } from "@/components/motion/PageTransition";
import { PrismBackground } from "@/components/site/prism-background";
import { safePublicPageSettings } from "@/lib/firestore/page-visibility";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const pageSettings = await safePublicPageSettings();

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <PrismBackground />
      <div className="relative z-10">
        <PageViewTracker />
        <SiteHeader pageSettings={pageSettings} />
        <main id="main" className="min-h-[70vh]">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter pageSettings={pageSettings} />
      </div>
    </div>
  );
}
