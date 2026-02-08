import { Metadata } from "next";

import { ContactForm } from "@/components/site/contact-form";
import { SectionShell } from "@/components/site/section-shell";

export const metadata: Metadata = {
  title: "Contact | Saleh Abbaas",
  description: "Contact Saleh Abbaas for projects and collaborations."
};

export default function ContactPage() {
  return (
    <SectionShell title="Contact" description="Tell me what you are building and where you need support.">
      <div className="max-w-2xl">
        <ContactForm />
      </div>
    </SectionShell>
  );
}
