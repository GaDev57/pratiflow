import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: Props) {
  await params; // consume params to avoid Next.js warning

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Teleconsultation via WhatsApp</h1>
        <p className="mt-4 text-muted-foreground">
          Les teleconsultations se font desormais via <strong>WhatsApp</strong> (appel video).
          Votre praticien vous contactera directement sur WhatsApp a l&apos;heure du rendez-vous.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Assurez-vous que WhatsApp est installe sur votre telephone ou ordinateur.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
