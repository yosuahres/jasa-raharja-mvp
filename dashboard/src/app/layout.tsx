import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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
  title: "Hospital Tiering",
  description: "Rujukan rumah sakit yang tepat untuk korban kecelakaan",
};

// Light unless a saved choice says otherwise; applied with the sidebar state before paint so it doesn't flash.
const THEME_BOOTSTRAP = `try{var d=document.documentElement.dataset,t=localStorage.getItem("theme");if(t==="dark")d.theme=t;else if(t==="system")delete d.theme;if(localStorage.getItem("sidebar")==="collapsed")d.sidebar="collapsed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* A plain inline script runs synchronously before first paint; next/script's beforeInteractive waits for the runtime. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
