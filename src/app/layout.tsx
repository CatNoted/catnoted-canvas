import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "catnoted canvas",
  description:
    "Local-first workspace canvas. Notion structure, Miro freedom. Your data stays in your browser.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14110B",
};

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(geist.variable, mono.variable)}>
      <body className="font-mono">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
