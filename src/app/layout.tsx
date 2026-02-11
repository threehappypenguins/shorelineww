import type { Metadata } from "next";
import { Merriweather, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DynamicFavicon from "@/components/DynamicFavicon";
import { ThemeProvider } from "next-themes";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans-next",
  display: "swap",
});

const serif = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shoreline Woodworks",
  description: "Stairs, railings, millwork, flooring, and renovations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon-light.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16-light.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32-light.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-light.png" />
      </head>
      <body className={`${sans.variable} ${serif.variable} flex min-h-screen flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DynamicFavicon />
          <Navbar />
          <main className="grow">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}