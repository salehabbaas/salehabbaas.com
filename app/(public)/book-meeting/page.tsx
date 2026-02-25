import { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { MeetingBooker } from "@/components/booking/meeting-booker";
import { SectionShell } from "@/components/site/section-shell";
import { ensurePublicPageVisible } from "@/lib/firestore/public-page-guard";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";

const BOOK_MEETING_DESCRIPTION =
  "Book a meeting with Saleh Abbaas to discuss AI agents, healthcare interoperability, and custom software delivery.";

export const metadata: Metadata = buildPageMetadata({
  title: "Book Meeting",
  description: BOOK_MEETING_DESCRIPTION,
  path: "/book-meeting"
});

export default async function BookMeetingPage() {
  await ensurePublicPageVisible("/book-meeting");
  const webPageJsonLd = pageSchema({
    title: "Book Meeting",
    description: BOOK_MEETING_DESCRIPTION,
    path: "/book-meeting"
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Home", url: resolveAbsoluteUrl("/") },
    { name: "Book Meeting", url: resolveAbsoluteUrl("/book-meeting") }
  ]);

  return (
    <SectionShell path="/book-meeting" title="Book Meeting" description="Choose an available time and meeting type.">
      <div className="max-w-3xl">
        <MeetingBooker />
      </div>
      <JsonLd id="schema-book-meeting-page" data={webPageJsonLd} />
      <JsonLd id="schema-book-meeting-breadcrumb" data={breadcrumbJsonLd} />
    </SectionShell>
  );
}
