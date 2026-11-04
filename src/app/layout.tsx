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
            <Link href="/" aria-label={m.nav.home} className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap font-black tracking-wide sm:tracking-wider">
              <span aria-hidden className="inline-block size-3 rotate-45 rounded-sm bg-accent" />
              <span className="flex flex-col leading-none">
                <span>
                  FOOTBALL <span className="text-accent">DNA</span>
                </span>
                <span className="mt-0.5 text-[9px] font-bold tracking-[0.08em] text-ink-muted sm:text-[10px] sm:tracking-[0.15em]">by FOOTBALL DNA LAB</span>
              </span>
            </Link>
            <nav className="flex items-center whitespace-nowrap">
              <Link href="/about" className="flex min-h-11 items-center px-1.5 text-xs text-ink-muted hover:text-ink sm:px-2 sm:text-sm">
                <span className="hidden min-[360px]:inline">{m.nav.about}</span>
                <span className="min-[360px]:hidden">{m.nav.aboutShort}</span>
              </Link>
              {isSupabaseConfigured() && (
                <Link href="/me" className="flex min-h-11 items-center px-1.5 text-xs font-bold text-accent hover:text-accent-strong sm:px-2 sm:text-sm">
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
          <p className="mt-2">運営：FOOTBALL DNA LAB</p>
          <p className="mt-2">
            <Link href="/about" className="underline underline-offset-2 hover:text-ink">
              {m.footer.privacy}
            </Link>
            {" ・ "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              {m.footer.privacyPolicy}
            </Link>
            {" ・ "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              {m.footer.terms}
            </Link>
          </p>
        </footer>
        <ServiceWorkerRegister updateLabel={m.pwa.updateReady} reloadLabel={m.pwa.reload} />
      </body>
    </html>
  );
}
