import { useCallback, useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Bold, Heading2, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "h2", "h3"];

function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

function isEmptyRichText(html: string): boolean {
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
  return text.length === 0;
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  disabled?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 220,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!editorRef.current || isInternalChange.current) return;
    const sanitized = sanitizeRichText(value || "");
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const sanitized = sanitizeRichText(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
    onChange(isEmptyRichText(sanitized) ? "" : sanitized);
    requestAnimationFrame(() => {
      isInternalChange.current = false;
    });
  }, [onChange]);

  const exec = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const toolbarButtonClass = "h-8 w-8 shrink-0";

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("bold")}
          disabled={disabled}
          aria-label="Negrita"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("italic")}
          disabled={disabled}
          aria-label="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("underline")}
          disabled={disabled}
          aria-label="Subrayado"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("formatBlock", "h2")}
          disabled={disabled}
          aria-label="Subtítulo"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("insertUnorderedList")}
          disabled={disabled}
          aria-label="Lista con viñetas"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => exec("insertOrderedList")}
          disabled={disabled}
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className={cn(
          "px-3 py-2 text-sm leading-relaxed outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "[&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
        style={{ minHeight }}
      />
    </div>
  );
}
