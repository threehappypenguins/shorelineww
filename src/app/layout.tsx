import type { Metadata } from "next";
import { Merriweather, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DynamicFavicon from "@/components/DynamicFavicon";
import { ThemeProvider } from "next-themes";
import Providers from "@/components/Providers";

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
  // metadataBase: new URL("https://shorelinewoodworks.ca"),
  metadataBase: new URL("http://localhost:3000"),
  manifest: "/manifest.json",
  title: "Shoreline Woodworks",
  description:
    "Stairs, railings, millwork, flooring, and renovations.",
  icons: {
    icon: [
      { rel: "icon", url: "favicon-16x16.png", sizes: "16x16" },
      { rel: "icon", url: "favicon-32x32.png", sizes: "32x32" },
      { rel: "icon", url: "favicon-192x192.png", sizes: "192x192" },
      { rel: "icon", url: "favicon-512x512.png", sizes: "512x512" },
    ],
    apple: [{ rel: "apple-touch-icon", url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "Shoreline Woodworks",
    description:
      "Stairs, railings, millwork, flooring, and renovations.",
    // url: "https://shorelinewoodworks.ca",
    url: "http://localhost:3000",
    siteName: "Shoreline Woodworks",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Shoreline Woodworks",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shoreline Woodworks",
    description:
      "Stairs, railings, millwork, flooring, and renovations.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon-light.ico" sizes="any" />
      </head>
      <body className={`${sans.variable} ${serif.variable} flex min-h-screen flex-col`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <DynamicFavicon />
            <Navbar />
            <main className="grow">{children}</main>
            <Footer />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}