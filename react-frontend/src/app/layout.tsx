import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NyayAI — India's First AI-Powered Bias Audit Tool",
  description: "Upload your datasets, uncover algorithmic bias, and build fairer AI systems — for a more just future.",
  icons: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
    >
      <body className="min-h-full flex flex-col bg-black">{children}</body>
    </html>
  );
}
