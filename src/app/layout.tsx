import "@/lib/zod-error-map";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniCRM · Omnipotency.ai",
  description: "AI-first CRM for wellness solopreneurs",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<JSX.Element> {
  const hdrs = await headers();
  const nonce = hdrs.get("x-csp-nonce") ?? hdrs.get("x-nextjs-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {nonce ? <meta property="csp-nonce" content={nonce} /> : null}
        {nonce ? (
          <script
            id="csp-nonce-bootstrap"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html:
                "(function(){var m=document.querySelector(\"meta[property=\\\"csp-nonce\\\"]\");if(!m)return;var v=m.getAttribute('content');if(!v)return;window.__webpack_nonce__=v;try{document.querySelectorAll('style:not([nonce])').forEach(function(s){s.setAttribute('nonce',v);});}catch(_){}var _ce=document.createElement;document.createElement=function(t){var el=_ce.call(document,t);if(t==='style'){try{el.setAttribute('nonce',v);}catch(_){}}return el;};})();",
            }}
          />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-csp-nonce={nonce}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        <Providers>
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
