import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { OfflineBanner } from "@/components/system/offline-banner";
import { StatusPage } from "@/components/system/status-page";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CaintaTrade",
  description: "Community item exchange for residents of Cainta, Rizal",
};

/** docs/02 E32 · scheduled maintenance takeover (NEXT_PUBLIC_MAINTENANCE=1). */
const maintenance = process.env.NEXT_PUBLIC_MAINTENANCE === "1";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {maintenance ? (
            <StatusPage
              code="503"
              kicker="Scheduled maintenance"
              title="CaintaTrade is briefly offline"
              blurb="We are doing a quick round of maintenance. Your listings, offers and messages are safe — check back shortly."
              icon="clock"
              primary={{ label: "Read the safety guide", href: "/how-it-works" }}
            />
          ) : (
            <>
              {children}
              <OfflineBanner />
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
