"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";

interface Props {
  content?: string;
  onChange?: (json: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Commencez à écrire...",
  editable = true,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? "",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      {editable && (
        <div className="flex flex-wrap gap-1">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="G"
            title="Gras"
          />
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
            title="Italique"
          />
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            label="S"
            title="Souligné"
          />
          <span className="mx-1 border-l" />
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            label="H2"
            title="Titre"
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            label="H3"
            title="Sous-titre"
          />
          <span className="mx-1 border-l" />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="•"
            title="Liste à puces"
          />
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="1."
            title="Liste numérotée"
          />
          <span className="mx-1 border-l" />
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            label="❝"
            title="Citation"
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      className="h-7 w-7 p-0 text-xs"
      onClick={onClick}
      title={title}
    >
      {label}
    </Button>
  );
}

/**
 * Read-only renderer for Tiptap JSON content.
 */
export function RichTextViewer({ content }: { content: Record<string, unknown> }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none text-sm",
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
