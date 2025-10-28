"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Undo,
  Redo,
  AlertTriangle,
  Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { detectPIIClient } from "@/lib/pii-validator";

interface NoteEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  onSave?: () => void;
  className?: string;
  editable?: boolean;
}

const FONT_FAMILIES = [
  { label: "Default", value: "default" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: "Courier New, monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Times", value: "Times New Roman, serif" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const TEXT_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#a855f7" },
  { label: "Orange", value: "#f97316" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "none" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

// FontSize extension for TipTap
const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement): string => element.style.fontSize.replace(/['"]+/g, ""),
            renderHTML: (attributes: Record<string, string | null>): Record<string, string> => {
              if (!attributes["fontSize"]) {
                return {};
              }
              return {
                style: `font-size: ${attributes["fontSize"]}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => { setMark: (mark: string, attributes: Record<string, string>) => { run: () => boolean } } }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => { setMark: (mark: string, attributes: Record<string, null>) => { removeEmptyTextStyle: () => { run: () => boolean } } } }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export function NoteEditor({
  content = "",
  placeholder = "Start typing your note...",
  onChange,
  onSave,
  className,
  editable = true,
}: NoteEditorProps): JSX.Element {
  const [piiWarning, setPiiWarning] = useState<{ show: boolean; types: string[] }>({
    show: false,
    types: [],
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
      FontSize,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange?.(html, text);

      // Check for PII in the text
      if (text && text.trim()) {
        const piiDetection = detectPIIClient(text);
        if (piiDetection.hasPII) {
          setPiiWarning({
            show: true,
            types: piiDetection.types,
          });
        } else {
          setPiiWarning({ show: false, types: [] });
        }
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "min-h-[120px] px-3 py-2",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-p:my-2 prose-ul:my-2 prose-ol:my-2",
          "prose-li:my-0",
        ),
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        // Tab = Indent (when in a list)
        if (event.key === "Tab" && !event.shiftKey) {
          if (editor && editor.isActive("listItem")) {
            event.preventDefault();
            editor.chain().focus().sinkListItem("listItem").run();
            return true;
          }
        }

        // Shift+Tab = Outdent (when in a list)
        if (event.key === "Tab" && event.shiftKey) {
          if (editor && editor.isActive("listItem")) {
            event.preventDefault();
            editor.chain().focus().liftListItem("listItem").run();
            return true;
          }
        }

        // Allow Ctrl+A / Cmd+A to select all
        if ((event.ctrlKey || event.metaKey) && event.key === "a") {
          return false; // Let browser handle it
        }

        // Enter without Shift = Save (if onSave is provided)
        if (event.key === "Enter" && !event.shiftKey && onSave) {
          event.preventDefault();
          onSave();
          return true;
        }
        // Shift+Enter = New line (default behavior)
        if (event.key === "Enter" && event.shiftKey) {
          return false;
        }
        return false;
      },
    },
  });

  if (!editor) {
    return <div className="min-h-[120px] animate-pulse bg-muted rounded-md" />;
  }

  return (
    <div className={cn("border rounded-md", className)}>
      {editable && (
        <div className="border-b p-2 flex flex-wrap items-center gap-1 bg-muted/50">
          {/* Row 1: Text Formatting */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-accent")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-accent")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-accent")}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 2 }) && "bg-accent")}
              title="Heading"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Row 2: Lists */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-accent")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-accent")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Row 3: Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Font Family */}
          <Select
            value={editor.getAttributes("textStyle")["fontFamily"] || "default"}
            onValueChange={(value) => {
              if (value === "default") {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(value).run();
              }
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value} className="text-xs">
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={editor.getAttributes("textStyle")["fontSize"] || "16px"}
            onValueChange={(value) => {
              editor.chain().focus().setFontSize(value).run();
            }}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Text Color */}
          <Select
            value={editor.getAttributes("textStyle")["color"] || "#000000"}
            onValueChange={(value) => {
              editor.chain().focus().setColor(value).run();
            }}
          >
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              {TEXT_COLORS.map((color) => (
                <SelectItem key={color.value} value={color.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Highlight */}
          <Select
            value={editor.getAttributes("highlight")["color"] || "none"}
            onValueChange={(value) => {
              if (value === "none") {
                editor.chain().focus().unsetHighlight().run();
              } else {
                editor.chain().focus().toggleHighlight({ color: value }).run();
              }
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <div className="flex items-center gap-1">
                <Highlighter className="h-3 w-3" />
                <SelectValue placeholder="Highlight" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {HIGHLIGHT_COLORS.map((color) => (
                <SelectItem key={color.value} value={color.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    {color.value !== "none" && (
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: color.value }}
                      />
                    )}
                    {color.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onSave && (
            <Button type="button" variant="default" size="sm" onClick={onSave} className="ml-auto">
              Save
            </Button>
          )}
        </div>
      )}

      {/* PII Warning */}
      {piiWarning.show && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Sensitive information detected
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                {piiWarning.types.join(", ")} will be automatically redacted when saved
              </p>
            </div>
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="select-text cursor-text" />

      {editable && onSave && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Shift</kbd> +{" "}
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> for new
          line • <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> to
          save
        </div>
      )}
    </div>
  );
}
