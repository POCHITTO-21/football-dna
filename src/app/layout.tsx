import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_LOCALE, getMessages } from "@/i18n";
import { ServiceWorkerRegister } from "@/components/pwa";

const m = getMessages();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: m.app.title, template: `%s｜${m.app.name}` },
  description: m.app.description,
  applicationName: m.app.name,
  appleWebApp: { capable: true, title: m.app.shortName, statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#060c1c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-navy-950"
        >
          {m.nav.skipToContent}
        </a>
        <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
            <Link href="/" aria-label={m.nav.home} className="flex min-h-11 items-center gap-2 font-black tracking-wider">
              <span aria-hidden className="inline-block size-3 rotate-45 rounded-sm bg-accent" />
              FOOTBALL <span className="text-accent">DNA</span>
            </Link>
            <nav className="flex items-center">
              <Link href="/about" className="flex min-h-11 items-center px-2 text-sm text-ink-muted hover:text-ink">
                {m.nav.about}
              </Link>
              {isSupabaseConfigured() && (
                <Link href="/me" className="flex min-h-11 items-center px-2 text-sm font-bold text-accent hover:text-accent-strong">
                  {m.nav.myPage}
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-xl px-4 pb-16 pt-6">
          {children}
        </main>
        <footer className="mx-auto max-w-xl px-4 pb-10 text-xs leading-relaxed text-ink-muted">
          <p>
            {m.footer.disclaimer}
          </p>
          <p className="mt-2">
            <Link href="/about" className="underline underline-offset-2 hover:text-ink">
              {m.footer.privacy}
            </Link>
          </p>
        </footer>
        <ServiceWorkerRegister updateLabel={m.pwa.updateReady} reloadLabel={m.pwa.reload} />
      </body>
    </html>
  );
}
