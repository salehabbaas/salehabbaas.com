import { Metadata } from "next";

import { MeetingBooker } from "@/components/booking/meeting-booker";
import { SectionShell } from "@/components/site/section-shell";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

const BOOK_MEETING_DESCRIPTION =
  "Book a meeting with Saleh Abbaas (Saleh Abbas) to discuss AI agents, healthcare interoperability, and custom software delivery.";

export const metadata: Metadata = buildPageMetadata({
  title: "Book Meeting",
  description: BOOK_MEETING_DESCRIPTION,
  path: "/book-meeting"
});

export default function BookMeetingPage() {
  const webPageJsonLd = pageSchema({
    title: "Book Meeting",
    description: BOOK_MEETING_DESCRIPTION,
    path: "/book-meeting"
  });

  return (
    <SectionShell title="Book Meeting" description="Choose an available time and meeting type.">
      <div className="max-w-3xl">
        <MeetingBooker />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </SectionShell>
  );
}
