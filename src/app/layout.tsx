import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { Masthead } from "@/components/layout/Masthead";
import { CategoryNav } from "@/components/layout/CategoryNav";
import { Footer } from "@/components/layout/Footer";
import { THEME_SCRIPT } from "@/components/layout/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "./providers";
import "./globals.css";
import { cn } from "@/lib/utils";

/**
 * Both families are self-hosted by `next/font` — the files are downloaded at
 * build time and served from our own origin, so the container makes no request
 * to Google at runtime and there is no render-blocking font stylesheet.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VOICE: news from every source, in one place",
    template: "%s · VOICE",
  },
  description:
    "A news aggregator that pulls stories from NewsAPI, The Guardian and The New York Times, and presents them in one clean, searchable, personalisable feed.",
  applicationName: "VOICE",
  openGraph: {
    title: "VOICE",
    description: "News from every source, in one place.",
    type: "website",
  },
};

// Light is the default, so the browser chrome should match it rather than
// following the OS.
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(archivo.variable, inter.variable)}>
      <head>
        {/* Applies a stored dark-mode choice before first paint, so a reader who
            picked dark never sees a white flash between navigations. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-surface-sunken min-h-dvh">
        <QueryProvider>
          <TooltipProvider delayDuration={300}>
          <a
            href="#main"
            className="bg-surface text-ink sr-only rounded px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
          >
            Skip to content
          </a>

          {/* The page sits on a card, as in the mockup: a white sheet floating
              on a sunken surround, edge-to-edge on small screens. */}
          <div className="bg-surface mx-auto min-h-dvh w-full">
            <Masthead />
            <CategoryNav />

            <main id="main" className="mx-auto max-w-page px-gutter py-7 md:px-8">
              {children}
            </main>

            <Footer />
          </div>
        </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
