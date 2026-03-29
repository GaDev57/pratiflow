import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "../template-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;
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

  const { data: template } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", id)
    .eq("practitioner_id", practitioner.id)
    .single();

  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modifier le modèle</h1>
        <p className="text-muted-foreground">{template.title as string}</p>
      </div>
      <TemplateEditor
        practitionerId={practitioner.id}
        template={{
          id: template.id as string,
          title: template.title as string,
          template_type: template.template_type as string,
          content_json: template.content_json as Record<string, unknown>,
          file_path: template.file_path as string | null,
          is_questionnaire: template.is_questionnaire as boolean,
          questionnaire_fields: (template.questionnaire_fields ?? []) as {
            id: string;
            type: "text" | "textarea" | "radio" | "checkbox" | "scale" | "boolean";
            label: string;
            required: boolean;
            options?: string[];
          }[],
        }}
      />
    </div>
  );
}
