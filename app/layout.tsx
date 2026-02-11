import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Exo_2 } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { safeSeoDefaults } from "@/lib/firestore/site-public";
import { personSchema, websiteSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl } from "@/lib/utils";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/metadata";
import { BRAND_NAME } from "@/lib/brand";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "";

const display = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

const body = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export async function generateMetadata(): Promise<Metadata> {
  const seoDefaults = await safeSeoDefaults();
  const title = BRAND_NAME;
  const description = seoDefaults.defaultDescription || DEFAULT_DESCRIPTION;
  const defaultOgImage = seoDefaults.defaultOgImage || resolveAbsoluteUrl("/api/og/page?title=Saleh%20Abbaas");
  const verification: Metadata["verification"] = {};

  if (GOOGLE_SITE_VERIFICATION) {
    verification.google = GOOGLE_SITE_VERIFICATION;
  }

  if (BING_SITE_VERIFICATION) {
    verification.other = {
      "msvalidate.01": BING_SITE_VERIFICATION
    };
  }

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    applicationName: BRAND_NAME,
    title: {
      default: title,
      template: `%s | ${title}`
    },
    description,
    keywords: [
      "Saleh Abbaas",
      "Saleh Abbas",
      "Saleh",
      "Abbas",
      "Saleh Ottawa",
      "Ottawa software engineer"
    ],
    creator: BRAND_NAME,
    publisher: BRAND_NAME,
    authors: [{ name: BRAND_NAME, url: resolveAbsoluteUrl("/") }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    verification: Object.keys(verification).length ? verification : undefined,
    icons: {
      icon: [{ url: "/SA-Logo.png", type: "image/png" }],
      shortcut: ["/SA-Logo.png"],
      apple: [{ url: "/SA-Logo.png" }]
    },
    alternates: {
      canonical: resolveAbsoluteUrl("/")
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: resolveAbsoluteUrl("/"),
      siteName: BRAND_NAME,
      images: [
        {
          url: defaultOgImage,
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
      images: [defaultOgImage]
    }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gtagIds = [GA_MEASUREMENT_ID, GOOGLE_ADS_ID].filter(Boolean);
  const primaryGtagId = gtagIds[0];
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}>
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(() => { try { const stored = localStorage.getItem('theme'); const dark = stored ? stored === 'dark' : true; if (dark) document.documentElement.classList.add('dark'); } catch (_) {} })();"
          }}
        />
        {GTM_ID ? (
          <Script
            id="google-gtm"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `
            }}
          />
        ) : null}
        {primaryGtagId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`} strategy="afterInteractive" />
            <Script
              id="google-gtag"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = window.gtag || gtag;
                  gtag('js', new Date());
                  ${gtagIds.map((id) => `gtag('config', '${id}');`).join("\n")}
                `
              }}
            />
          </>
        ) : null}
        <Script
          id="google-ads-helper"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.gtagSendEvent = function(url) {
                var adsSendTo = '${GOOGLE_ADS_ID}${GOOGLE_ADS_CONVERSION_LABEL ? `/${GOOGLE_ADS_CONVERSION_LABEL}` : ""}';
                var callback = function () {
                  if (typeof url === 'string' && url.length > 0) {
                    window.location = url;
                  }
                };
                if (typeof window.gtag === 'function') {
                  if (adsSendTo && adsSendTo.indexOf('/') > -1) {
                    window.gtag('event', 'conversion', {
                      'send_to': adsSendTo,
                      'event_callback': callback,
                      'event_timeout': 2000
                    });
                  } else {
                    window.gtag('event', 'ads_conversion_About_Us_1', {
                      'event_callback': callback,
                      'event_timeout': 2000
                    });
                  }
                } else {
                  callback();
                }
                return false;
              }
            `
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
