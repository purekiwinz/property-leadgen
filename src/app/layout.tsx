import type { Metadata } from "next";
import { Poppins, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import AnalyticsListener from "@/components/AnalyticsListener";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const SITE_URL = 'https://edscanlan.co.nz';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Free Property Appraisal | Ed Scanlan — Hibiscus Coast Real Estate',
    template: '%s | Ed Scanlan — Professionals Hibiscus Coast',
  },
  description: 'Get a free, no-pressure market appraisal from Ed Scanlan at Professionals Hibiscus Coast. Serving Orewa, Millwater, Milldale and Red Beach. 20+ years marketing experience, 5-star client reviews.',
  keywords: [
    'free property appraisal Hibiscus Coast',
    'market appraisal Orewa',
    'real estate agent Millwater',
    'sell house Hibiscus Coast',
    'Ed Scanlan Professionals',
    'Professionals Hibiscus Coast',
    'property valuation Orewa',
    'Red Beach house value',
    'Milldale real estate agent',
    'Hibiscus Coast property sales',
    'free market appraisal NZ',
  ],
  authors: [{ name: 'Ed Scanlan', url: SITE_URL }],
  creator: 'Ed Scanlan',
  publisher: 'Professionals Hibiscus Coast',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NZ',
    url: SITE_URL,
    siteName: 'Ed Scanlan — Professionals Hibiscus Coast',
    title: 'Free Property Appraisal | Ed Scanlan — Hibiscus Coast Real Estate',
    description: 'Get a free, no-pressure market appraisal from Ed Scanlan at Professionals Hibiscus Coast. Serving Orewa, Millwater, Milldale and Red Beach.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Ed Scanlan — Free Market Appraisal, Hibiscus Coast Real Estate' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Property Appraisal | Ed Scanlan — Hibiscus Coast Real Estate',
    description: 'Get a free, no-pressure market appraisal from Ed Scanlan at Professionals Hibiscus Coast.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const linkedinPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${sourceSerif.variable} antialiased`}
      >
        <AnalyticsListener />
        {/* Meta Pixel Code */}
        {pixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img height="1" width="1" style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}

        {/* Google Analytics & Ads — global site tag (gtag.js) */}
        {(gaId || googleAdsId) && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId || googleAdsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${gaId ? `gtag('config', '${gaId}');` : ''}
                ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ''}
              `}
            </Script>
          </>
        )}

        {/* LinkedIn Insight Tag */}
        {linkedinPartnerId && (
          <Script id="linkedin-insight" strategy="afterInteractive">
            {`
              _linkedin_partner_id = "${linkedinPartnerId}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
              if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);})(window.lintrk);
            `}
          </Script>
        )}

        {children}
      </body>
    </html>
  );
}
