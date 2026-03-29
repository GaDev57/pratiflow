"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Une erreur inattendue est survenue
          </h1>
          <p className="mb-6 text-gray-600">
            Nous sommes désolés pour la gêne occasionnée. Veuillez réessayer.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
