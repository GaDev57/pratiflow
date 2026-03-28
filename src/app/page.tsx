import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          PratiFlow
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Gestion de cabinet simplifiée pour praticiens de santé et bien-être
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Se connecter
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
