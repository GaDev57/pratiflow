import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Fetch templates
  const { data: templates } = await supabase
    .from("document_templates")
    .select("*")
    .eq("practitioner_id", practitioner.id)
    .order("created_at", { ascending: false });

  const templateList = (templates ?? []) as {
    id: string;
    title: string;
    template_type: string;
    is_questionnaire: boolean;
    created_at: string;
    updated_at: string;
  }[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles de documents</h1>
          <p className="text-muted-foreground">
            Gérez vos questionnaires, courriers types et documents
          </p>
        </div>
        <Link
          href="/dashboard/templates/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nouveau modèle
        </Link>
      </div>

      {templateList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucun modèle pour le moment. Créez votre premier modèle de document.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templateList.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
}: {
  template: {
    id: string;
    title: string;
    template_type: string;
    is_questionnaire: boolean;
    updated_at: string;
  };
}) {
  const typeLabels: Record<string, string> = {
    rich_text: "Texte",
    pdf: "PDF",
    questionnaire: "Questionnaire",
  };

  return (
    <Link
      href={`/dashboard/templates/${template.id}`}
      className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium">{template.title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {typeLabels[template.template_type] ?? template.template_type}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Modifié le{" "}
        {new Date(template.updated_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </Link>
  );
}
