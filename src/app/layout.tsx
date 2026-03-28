import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PratiFlow — Gestion de cabinet pour praticiens de santé",
  description:
    "Plateforme SaaS de prise de rendez-vous, téléconsultation et suivi patient pour les praticiens de santé et bien-être.",
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
