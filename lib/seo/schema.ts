import { resolveAbsoluteUrl } from "@/lib/utils";

export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Saleh Abbaas",
    alternateName: ["Saleh Abbas", "Saleh"],
    url: resolveAbsoluteUrl("/"),
    image: resolveAbsoluteUrl("/SA-Logo.png"),
    jobTitle: "Software Engineer (Healthcare Interoperability)",
    sameAs: [
      "https://linkedin.com/in/salehabbaas",
      "https://youtube.com/@salehabbaas",
      "https://instagram.com/salehabbaas",
      "https://x.com/salehabbaas"
    ],
    knowsAbout: [
      "Healthcare Interoperability",
      "HL7",
      "FHIR",
      "Rhapsody",
      "Mirth Connect",
      "Epic EHR",
      "HIPAA",
      "PHIPA",
      "DICOM",
      "PACS",
      "Power BI",
      "Clinical Data Platforms"
    ]
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Saleh Abbaas",
    alternateName: ["Saleh Abbas", "Saleh Ottawa"],
    url: resolveAbsoluteUrl("/"),
    description:
      "Personal website of Saleh Abbaas with healthcare interoperability engineering, clinical data platform work, and professional services.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${resolveAbsoluteUrl("/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    },
    publisher: {
      "@type": "Person",
      name: "Saleh Abbaas"
    }
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function creatorArticleSchema(input: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    mainEntityOfPage: resolveAbsoluteUrl(`/creator/${input.slug}`),
    author: {
      "@type": "Person",
      name: "Saleh Abbaas"
    },
    publisher: {
      "@type": "Person",
      name: "Saleh Abbaas"
    },
    image: input.image ? [input.image] : [resolveAbsoluteUrl(`/api/og/creator?title=${encodeURIComponent(input.title)}`)],
    keywords: input.keywords?.join(", ")
  };
}
