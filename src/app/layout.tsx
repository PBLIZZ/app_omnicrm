import "@/lib/zod-error-map";
import type { Metadata } from "next";
import { headers } from "next/headers";
import AuthHeader from "@/components/AuthHeader";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

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
}>) {
  const hdrs = await headers();
  const nonce = hdrs.get("x-csp-nonce") ?? hdrs.get("x-nextjs-nonce") ?? undefined;
  return (
    <html lang="en">
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
      >
        <AuthHeader />
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
