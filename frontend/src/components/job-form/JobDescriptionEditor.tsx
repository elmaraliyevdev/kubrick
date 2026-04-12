import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { legacyDescriptionToHtml, sanitizeJobDescriptionHtml } from "@/utils/jobDescriptionHtml";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect } from "react";

interface JobDescriptionEditorProps {
  /** Initial HTML only; editor does not re-sync from parent on each keystroke (avoids cursor jump). Remount with `key` when switching jobs. */
  defaultContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function JobDescriptionEditor({
  defaultContent,
  onChange,
  placeholder = "Describe the role, team, and what success looks like…",
  disabled,
  id,
  className,
}: JobDescriptionEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: legacyDescriptionToHtml(defaultContent),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-job-desc max-w-none min-h-[200px] px-3 py-3 text-sm outline-none",
          "focus:outline-none",
          "[&_p]:mb-3 [&_p:last-child]:mb-0",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:my-0.5",
          "[&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold",
        ),
        ...(id ? { id } : {}),
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeJobDescriptionHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[248px] rounded-md border border-input bg-muted/30 animate-pulse",
          className,
        )}
        aria-hidden
      />
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div className={cn("rounded-md border border-input bg-background shadow-xs", className)}>
      <div
        className="flex flex-wrap gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1"
        role="toolbar"
        aria-label="Formatting"
      >
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Bold"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Italic"
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          aria-label="Underline"
        >
          <UnderlineIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("strike") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          aria-label="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </Button>
        <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          aria-label="Heading 2"
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          aria-label="Heading 3"
        >
          <Heading3 className="size-4" />
        </Button>
        <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("link") ? "secondary" : "ghost"}
          size="icon-sm"
          className="size-8"
          onClick={setLink}
          disabled={disabled}
          aria-label="Link"
        >
          <Link2 className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
