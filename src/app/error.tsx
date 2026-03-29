"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="mb-6 text-muted-foreground">
          Une erreur est survenue. Veuillez réessayer ou revenir à l&apos;accueil.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-md border px-4 py-2 hover:bg-accent"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
