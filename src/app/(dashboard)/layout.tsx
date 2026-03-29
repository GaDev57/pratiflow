import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string;
  const fullName = user.user_metadata?.full_name as string;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold">
              PratiFlow
            </Link>
            <nav className="hidden gap-4 sm:flex">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Tableau de bord
              </Link>
              {role === "practitioner" && (
                <>
                  <Link
                    href="/dashboard/calendar"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Calendrier
                  </Link>
                  <Link
                    href="/dashboard/patients"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Patients
                  </Link>
                  <Link
                    href="/dashboard/templates"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Modèles
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Paramètres
                  </Link>
                  <Link
                    href="/dashboard/access-logs"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Journal
                  </Link>
                </>
              )}
              {role === "patient" && (
                <>
                  <Link
                    href="/dashboard/appointments"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Mes rendez-vous
                  </Link>
                  <Link
                    href="/dashboard/documents"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Documents
                  </Link>
                  <Link
                    href="/dashboard/messages"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Messages
                  </Link>
                </>
              )}
              <Link
                href="/dashboard/account"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Mon compte
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{fullName}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
      <PushNotificationPrompt />
    </div>
  );
}
