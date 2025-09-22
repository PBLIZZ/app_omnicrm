import "@/lib/validation/zod-error-map";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import RootProviders from "@/components/providers/root-providers";
import { AppErrorBoundary } from "@/components/error-boundaries";
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
  title: "OmniCRM by Omnipotency.ai",
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
        {/* Optional: expose nonce for later use by <Script nonce={nonce}> if you add inline scripts */}
        {nonce ? <meta property="csp-nonce" content={nonce} /> : null}
        {/* No bootstrap script needed. If/when you add a script: <Script nonce={nonce} strategy="afterInteractive">...</Script> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-csp-nonce={nonce}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        <AppErrorBoundary>
          <RootProviders>
            <main id="main-content">{children}</main>
          </RootProviders>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
