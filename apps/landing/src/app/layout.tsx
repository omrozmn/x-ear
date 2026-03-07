import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "X-Ear - İşitme Merkeziniz için Hepsi Bir Arada CRM Çözümü",
  description: "Hasta yönetiminden SGK entegrasyonuna, stok takibinden raporlamaya kadar kliniğinizin tüm ihtiyaçları için modern CRM platformu.",
  metadataBase: new URL('https://x-ear.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'X-Ear - Modern İşitme Merkezi CRM',
    description: 'Kliniğinizin tüm ihtiyaçları için hepsi bir arada modern platform.',
    url: 'https://x-ear.com',
    siteName: 'X-Ear',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'X-Ear - Modern İşitme Merkezi CRM',
    description: 'Kliniğinizin tüm ihtiyaçları için hepsi bir arada modern platform.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'X-Ear',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning className="scroll-smooth">
      <body className="antialiased min-h-screen flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "X-Ear",
                "url": "https://x-ear.com",
                "logo": "https://x-ear.com/logo/x.svg",
                "sameAs": [
                  "https://twitter.com/xear",
                  "https://linkedin.com/company/xear"
                ]
              })
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "X-Ear",
                "url": "https://x-ear.com",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://x-ear.com/search?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              })
            }}
          />
          <QueryProvider>
            <LocaleProvider>
              {children}
            </LocaleProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
