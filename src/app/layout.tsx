
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/site/AppShell";
import { ThemeProvider } from "@/components/site/theme";
import AnalyticsScripts from "@/components/site/AnalyticsScripts";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://twincity-ui.pages.dev"),
  applicationName: "TwinCity UI",
  title: {
    default: "TwinCity UI — Proof-first Ops Control Tower",
    template: "%s | TwinCity UI",
  },
  description:
    "Digital twin ops console with reviewable runtime, dispatch, handoff, and export status pages.",
  keywords: [
    "digital twin",
    "operations console",
    "dispatch board",
    "incident triage",
    "shift handoff",
    "next.js portfolio",
    "ai systems engineering",
  ],
  openGraph: {
    title: "TwinCity UI — Proof-first Ops Control Tower",
    description:
      "Review ingest posture, runtime contract, dispatch lanes, handoff risk, and operator proof in one pass.",
    url: "https://twincity-ui.pages.dev",
    siteName: "TwinCity UI",
    images: [
      {
        url: "/screenshots/ops_console.png",
        alt: "TwinCity UI operator console screenshot",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TwinCity UI — Proof-first Ops Control Tower",
    description:
      "Digital twin ops console with reviewable runtime, dispatch, handoff, and export surfaces.",
    images: ["/screenshots/ops_console.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "google-adsense-account": "",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-theme="atelier">
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <AnalyticsScripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
