import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hospital Tiering | Databiota",
    template: "%s | Databiota",
  },
  description: "Rujukan rumah sakit yang tepat untuk korban kecelakaan",
};

// Applies the saved theme and sidebar state before paint so a manual choice doesn't flash.
const THEME_BOOTSTRAP = `try{var d=document.documentElement.dataset,t=localStorage.getItem("theme");if(t==="light"||t==="dark")d.theme=t;if(localStorage.getItem("sidebar")==="collapsed")d.sidebar="collapsed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        {children}
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
      </body>
    </html>
  );
}
