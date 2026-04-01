import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <Script id="openlearn-splash-skip" strategy="beforeInteractive">
          {`try{var k="openlearn-splash-dismissed";if(sessionStorage.getItem(k))document.documentElement.classList.add("splash-skip")}catch(e){}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
