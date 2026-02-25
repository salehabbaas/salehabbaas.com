import { resolveAbsoluteUrl } from "@/lib/utils";

type ServiceSummary = {
  title: string;
  detail: string;
};

type FaqEntry = {
  question: string;
  answer: string;
};

type ItemListEntry = {
  name: string;
  url: string;
};

const CANONICAL_ORIGIN = "https://salehabbaas.com";
const PERSON_ID = `${CANONICAL_ORIGIN}/#person`;
const WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`;

function pageId(path: string) {
  return `${resolveAbsoluteUrl(path)}#webpage`;
}

function webpageNode(input: { path: string; name: string; description: string; type?: string }) {
  return {
    "@type": input.type ?? "WebPage",
    "@id": pageId(input.path),
    url: resolveAbsoluteUrl(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: resolveAbsoluteUrl("/og-image.png")
    }
  };
}

export function personSchema() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Saleh Abbaas",
    alternateName: ["Saleh Abbas"],
    jobTitle: "Software Engineer",
    url: CANONICAL_ORIGIN,
    image: resolveAbsoluteUrl("/SalehAbbaas.jpeg"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ottawa",
      addressRegion: "Ontario",
      addressCountry: "Canada"
    },
    sameAs: [
      "https://www.linkedin.com/in/salehabbaas",
      "https://www.youtube.com/@salehabbaas",
      "https://www.x.com/salehabbaas",
      "https://www.instagram.com/salehabbaas"
    ],
    knowsAbout: [
      "Software Engineering",
      "Healthcare Interoperability",
      "AI Engineering",
      "HL7",
      "FHIR",
      "Rhapsody",
      "Clinical Data Platforms",
      "Cloud Architecture"
    ]
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "Saleh Abbaas",
    alternateName: ["Saleh Abbas"],
    url: CANONICAL_ORIGIN,
    description: "Official website of Saleh Abbaas, a software engineer based in Ottawa, Ontario, Canada.",
    inLanguage: "en-CA",
    potentialAction: {
      "@type": "SearchAction",
      target: `${resolveAbsoluteUrl("/blog")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    },
    publisher: {
      "@id": PERSON_ID
    }
  };
}

export function siteGraphSchema() {
  const corePages = [
    {
      path: "/",
      name: "Saleh Abbaas | Software Engineer",
      description:
        "Official website of Saleh Abbaas, software engineer in Ottawa, Canada focused on AI systems and healthcare interoperability."
    },
    {
      path: "/about",
      name: "About Saleh Abbaas",
      description: "Biography and expertise summary for Saleh Abbaas, software engineer in Ottawa, Canada.",
      type: "AboutPage"
    },
    {
      path: "/experience",
      name: "Experience",
      description: "Professional software engineering experience across healthcare, AI, and cloud delivery."
    },
    {
      path: "/projects",
      name: "Projects",
      description: "Portfolio projects and case studies by Saleh Abbaas."
    },
    {
      path: "/services",
      name: "Services",
      description: "Software engineering services, AI implementation, and interoperability consulting."
    },
    {
      path: "/blog",
      name: "Blog",
      description: "Technical blog posts about software engineering, AI, and healthcare interoperability."
    },
    {
      path: "/creator",
      name: "Creator",
      description: "Creator hub with practical AI and engineering content."
    },
    {
      path: "/ai-news",
      name: "AI News",
      description: "AI updates and explainers from Saleh Abbaas."
    },
    {
      path: "/contact",
      name: "Contact",
      description: "Contact Saleh Abbaas for software engineering and consulting."
    },
    {
      path: "/public-statement",
      name: "Public Statement",
      description: "Public identity and professional verification statement for Saleh Abbaas."
    }
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [personSchema(), websiteSchema(), ...corePages.map((page) => webpageNode(page))]
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

export function servicesOfferCatalogSchema(services: ServiceSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${resolveAbsoluteUrl("/services")}#service`,
    name: "Software Engineering Services by Saleh Abbaas",
    provider: {
      "@id": PERSON_ID
    },
    serviceType: "Software Engineering and AI Systems Delivery",
    areaServed: {
      "@type": "Country",
      name: "Canada"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Service Catalog",
      itemListElement: services.map((service, index) => ({
        "@type": "Offer",
        position: index + 1,
        itemOffered: {
          "@type": "Service",
          "@id": `${resolveAbsoluteUrl("/services")}#offer-${index + 1}`,
          name: service.title,
          description: service.detail
        }
      }))
    }
  };
}

export function collectionPageSchema(input: { path: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    ...webpageNode({ ...input, type: "CollectionPage" }),
    publisher: { "@id": PERSON_ID }
  };
}

export function aboutPageSchema(input: { name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    ...webpageNode({ path: "/about", name: input.name, description: input.description, type: "AboutPage" }),
    mainEntity: { "@id": PERSON_ID }
  };
}

export function itemListSchema(input: { name: string; path: string; items: ItemListEntry[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${resolveAbsoluteUrl(input.path)}#itemlist`,
    name: input.name,
    url: resolveAbsoluteUrl(input.path),
    itemListOrder: "http://schema.org/ItemListOrderAscending",
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url
    }))
  };
}

export function faqPageSchema(input: { path: string; entries: FaqEntry[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${resolveAbsoluteUrl(input.path)}#faq`,
    url: resolveAbsoluteUrl(input.path),
    mainEntity: input.entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer
      }
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
      "@id": PERSON_ID
    },
    publisher: {
      "@id": PERSON_ID
    },
    image: input.image ? [input.image] : [resolveAbsoluteUrl(`/api/og/creator?title=${encodeURIComponent(input.title)}`)],
    keywords: input.keywords?.join(", ")
  };
}
