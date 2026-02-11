import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PageViewTracker } from "@/components/site/page-view-tracker";
import { PageTransition } from "@/components/motion/PageTransition";
import { PrismBackground } from "@/components/site/prism-background";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <PrismBackground />
      <div className="relative z-10">
        <PageViewTracker />
        <SiteHeader />
        <main id="main" className="min-h-[70vh]">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
