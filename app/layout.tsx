import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Exo_2 } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { JsonLd } from "@/components/seo/json-ld";
import { safeSeoDefaults } from "@/lib/firestore/site-public";
import { siteGraphSchema } from "@/lib/seo/schema";
import { resolveAbsoluteUrl, resolveSiteUrl } from "@/lib/utils";
import { DEFAULT_DESCRIPTION, DEFAULT_SOCIAL_IMAGE, defaultRobotsMetadata } from "@/lib/seo/metadata";
import { BRAND_NAME } from "@/lib/brand";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "";
const ICON_VERSION = "20260218-4";

const display = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display"
});

const body = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono"
});

export async function generateMetadata(): Promise<Metadata> {
  const seoDefaults = await safeSeoDefaults();
  const title = `${BRAND_NAME} | Software Engineer`;
  const description = seoDefaults.defaultDescription || DEFAULT_DESCRIPTION;
  const defaultOgImage = resolveAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
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
    metadataBase: new URL(resolveSiteUrl()),
    applicationName: BRAND_NAME,
    title: {
      default: title,
      template: `%s | ${BRAND_NAME}`
    },
    description,
    keywords: [
      "Saleh Abbaas",
      "Saleh Abbaas software engineer",
      "Saleh Abbaas Ottawa",
      "Ottawa software engineer",
      "Software engineer Canada"
    ],
    creator: BRAND_NAME,
    publisher: BRAND_NAME,
    authors: [{ name: BRAND_NAME, url: resolveAbsoluteUrl("/") }],
    robots: defaultRobotsMetadata(),
    verification: Object.keys(verification).length ? verification : undefined,
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: `/favicon.ico?v=${ICON_VERSION}`, type: "image/x-icon", sizes: "any" },
        { url: `/sa-icon.svg?v=${ICON_VERSION}`, type: "image/svg+xml" },
        { url: `/favicon-48x48.png?v=${ICON_VERSION}`, sizes: "48x48", type: "image/png" },
        { url: `/favicon-32x32.png?v=${ICON_VERSION}`, sizes: "32x32", type: "image/png" },
        { url: `/favicon-16x16.png?v=${ICON_VERSION}`, sizes: "16x16", type: "image/png" }
      ],
      shortcut: [{ url: `/favicon.ico?v=${ICON_VERSION}`, type: "image/x-icon" }],
      apple: [{ url: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png" }]
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
        <JsonLd id="schema-site-graph" data={siteGraphSchema()} />
      </body>
    </html>
  );
}
