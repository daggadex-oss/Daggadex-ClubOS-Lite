import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { IosInstallTooltip } from "@/components/ios-install-tooltip";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Daggadex ClubOS",
  description: "Private cannabis club — live menu and order pipeline",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClubOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#26311F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
        <IosInstallTooltip />
      </body>
    </html>
  );
}
