import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PageViewTracker } from "@/components/site/page-view-tracker";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
