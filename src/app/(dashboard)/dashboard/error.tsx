"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-xl font-bold">
          Erreur de chargement
        </h1>
        <p className="mb-6 text-muted-foreground">
          Impossible de charger cette page. Veuillez réessayer.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border px-4 py-2 hover:bg-accent"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
