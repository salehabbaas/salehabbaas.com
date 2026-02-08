import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";

import "./globals.css";

import { personSchema, websiteSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo/metadata";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif-display"
});

const title = DEFAULT_TITLE;
const description = DEFAULT_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Saleh Abbaas | Software Engineer"
  },
  description,
  alternates: {
    canonical: resolveAbsoluteUrl("/")
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: resolveAbsoluteUrl("/"),
    siteName: "Saleh Abbaas",
    images: [
      {
        url: resolveAbsoluteUrl("/api/og/creator?title=Saleh%20Abbaas"),
        width: 1200,
        height: 630,
        alt: "Saleh Abbaas"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [resolveAbsoluteUrl("/api/og/creator?title=Saleh%20Abbaas")]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: resolveAbsoluteUrl("/")
      }
    ]
  };

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${playfair.variable} font-sans`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => { try { const stored = localStorage.getItem('theme'); const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; if (dark) document.documentElement.classList.add('dark'); } catch (_) {} })();"
          }}
        />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personSchema())
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema())
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumb)
          }}
        />
      </body>
    </html>
  );
}
