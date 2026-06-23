import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import PwaRegister from "../components/PwaRegister";
import PerformancePanel from "@/components/PerformancePanel";
import ContentAreaWrapper from "@/components/ContentAreaWrapper";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "OXY-HR PRO - Enterprise Multi-Hotel HRMS & Workforce Management",
    template: "%s | OXY-HR PRO"
  },
  description: "Next-generation enterprise human resource management system tailored for luxury hotel chains, multi-tenant hospitality management, workforce scheduling, attendance tracking, and HR analytics across India.",
  keywords: [
    "OXY Hotels", "HRMS", "hotel management", "workforce management", "human resources",
    "attendance tracking", "payroll", "India hotels", "hospitality HR", "employee management",
    "hotel chain HRMS", "multi-hotel", "staff scheduling", "HR analytics", "oxyhotels"
  ],
  authors: [{ name: "OXY Hotels", url: "https://oxyhr.com" }],
  creator: "OXY Hotels",
  publisher: "OXY Hospitality Technologies",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "OXY-HR PRO",
    title: "OXY-HR PRO - Enterprise Multi-Hotel HRMS & Workforce Management",
    description: "Next-generation enterprise human resource management system for luxury hotel chains, workforce scheduling, attendance tracking, and HR analytics.",
    url: "https://oxyhr.com",
    countryName: "India",
    images: [
      {
        url: "/oxy-logo.jpeg",
        width: 800,
        height: 400,
        alt: "OXY-HR PRO - Enterprise HRMS for Hotels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OXY-HR PRO - Enterprise Multi-Hotel HRMS",
    description: "Next-generation workforce management for luxury hotel chains across India.",
    images: ["/oxy-logo.jpeg"],
    creator: "@oxyhotels",
  },
  verification: {
    google: "google-site-verification-code",
  },
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
    "geo.position": "20.5937;78.9629",
    "ICBM": "20.5937, 78.9629",
    "classification": "Business",
    "distribution": "Global",
    "rating": "General",
    "revisit-after": "7 days",
  },
  category: "business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${outfit.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="OXY-HR PRO" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OXY-HR PRO" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        
        {/* Material Symbols */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        
        {/* Inline theme script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('oxy-theme');const theme=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(theme==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "OXY-HR PRO",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, iOS, Android",
              "description": "Enterprise Multi-Hotel HRMS & Workforce Management System",
              "url": "https://oxyhr.com",
              "author": { "@type": "Organization", "name": "OXY Hotels" },
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" }
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <PwaRegister />
        <PerformancePanel />
        <div className="flex-1 flex flex-col">
          <ContentAreaWrapper>
            {children}
          </ContentAreaWrapper>
        </div>
        <Footer />
      </body>
    </html>
  );
}