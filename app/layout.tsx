import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Header from "@/components/layout/Header";
import ToastProvider from "@/components/ui/Toast";
import SpeechInit from "@/components/ui/SpeechInit";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AWL Master",
  description: "YDS / YÖKDİL için 570 Academic Word List kelime çalışma platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ToastProvider />
        <SpeechInit />
      </body>
    </html>
  );
}
