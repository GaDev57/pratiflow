import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | PratiFlow",
    default: "PratiFlow — Gestion de cabinet pour praticiens de sant\u00e9",
  },
  description:
    "Plateforme SaaS de prise de rendez-vous, t\u00e9l\u00e9consultation et suivi patient pour les praticiens de sant\u00e9 et bien-\u00eatre. Agenda en ligne, dossiers patients collaboratifs et vid\u00e9oconsultation s\u00e9curis\u00e9e.",
  metadataBase: new URL("https://pratiflow.com"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "PratiFlow",
    title: "PratiFlow — Gestion de cabinet pour praticiens de sant\u00e9",
    description:
      "Prise de rendez-vous, t\u00e9l\u00e9consultation et suivi patient pour praticiens de sant\u00e9 et bien-\u00eatre.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PratiFlow — Gestion de cabinet pour praticiens de sant\u00e9",
    description:
      "Prise de rendez-vous, t\u00e9l\u00e9consultation et suivi patient pour praticiens de sant\u00e9 et bien-\u00eatre.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
