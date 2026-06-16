import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css"; // Reload theme
import Footer from "@/components/Footer";
import PwaRegister from "../components/PwaRegister";
import PerformancePanel from "@/components/PerformancePanel";
import ContentAreaWrapper from "@/components/ContentAreaWrapper";
import ThemeToggle from '@/components/ThemeToggle';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OXY-HR PRO - Enterprise Multi-Hotel HRMS",
  description: "Next-generation human resource management system tailored for luxury hotel chains and multi-tenant hospitality management.",
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
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OXY-HR PRO" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        {/* Inline script to apply persisted theme before hydration to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('oxy-theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}` }} />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <PwaRegister />
        <PerformancePanel />
        <ThemeToggle />
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
