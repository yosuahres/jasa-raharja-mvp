"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

import type { ActionState } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CONTROL } from "./form-dialog";

// The box the text and every control share: as tall as a control, hanging over the row's padding so
// nothing around it moves when the text turns into a control.
const BOX = "-mx-1.5 -my-1 w-[calc(100%+0.75rem)] min-w-0 rounded-md px-1.5";

export type Choice = { value: string | null; label: string };

export type InlineControl = { kind: "text" } | { kind: "number"; min?: number; max?: number } | { kind: "multiline" } | { kind: "choice"; options: Choice[] };

/**
 * A fact that is edited where it's shown. Clicking it swaps the text for its control: a field ready
 * for typing, or a list of choices already open. Typing saves on Enter or on leaving the field;
 * Escape puts the old value back. A choice saves as soon as it's picked. The new value shows at
 * once and goes back if the save fails.
 */
export function InlineEdit({
  label,
  value,
  control,
  save,
  display = (value) => value,
  empty = "—",
  className,
}: {
  /** What the fact is called, for assistive tech and the "Ubah …" hint. */
  label: string;
  value: string;
  control: InlineControl;
  save: (value: string) => Promise<ActionState>;
  /** How the value reads when it isn't being edited. */
  display?: (value: string) => React.ReactNode;
  /** What stands in for an empty value. */
  empty?: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const [pending, startTransition] = useTransition();
  // Whether the control is still being edited: leaving it after Enter or Escape must not save again.
  const live = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // After a save the page refreshes with what the server has; that wins over what was typed.
  if (value !== lastValue) {
    setLastValue(value);
    setShown(value);
  }

  // Focus goes back to the fact once its control is gone, so keyboard users carry on from there.
  useEffect(() => {
    if (wasEditing.current && !editing) button.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);

  const edit = () => {
    setDraft(shown);
    live.current = true;
    setEditing(true);
  };

  const cancel = () => {
    live.current = false;
    setEditing(false);
  };

  const commit = (next: string) => {
    live.current = false;
    setEditing(false);
    const trimmed = next.trim();
    if (trimmed === shown) return;
    const previous = shown;
    setShown(trimmed);
    startTransition(async () => {
      const result = await save(trimmed);
      if (result.error) {
        setShown(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Tersimpan", { id: "inline-edit" });
    });
  };

  const leave = () => {
    if (live.current) commit(draft);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !(control.kind === "multiline" && event.shiftKey)) {
      event.preventDefault();
      commit(draft);
    }
  };

  if (!editing) {
    return (
      <button
        ref={button}
        type="button"
        onClick={edit}
        disabled={pending}
        title={`Ubah ${label.toLowerCase()}`}
        className={cn(
          BOX,
          "group/edit relative flex min-h-7 cursor-pointer items-center py-1 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted disabled:cursor-default disabled:opacity-60",
          className,
        )}
      >
        <span className={cn("block min-w-0 flex-1 break-words", !shown && "text-muted-foreground")}>{shown ? display(shown) : empty}</span>
        <span className="sr-only">, ubah {label.toLowerCase()}</span>
        {/* Over the text, not beside it, so the text sits and wraps exactly as it did before. */}
        <Pencil aria-hidden className="absolute top-2 right-1.5 size-3 rounded-sm bg-muted text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100" />
      </button>
    );
  }

  if (control.kind === "choice") {
    return (
      <Select
        items={control.options}
        value={shown || null}
        defaultOpen
        onValueChange={(next) => commit(next ?? "")}
        onOpenChange={(open) => {
          if (!open) cancel();
        }}
      >
        <SelectTrigger size="sm" className={cn(BOX, "h-7 pl-1.5", className)} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={option.value ?? ""} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const shared = {
    autoFocus: true,
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
    onKeyDown,
    onBlur: leave,
    "aria-label": label,
  };

  if (control.kind === "multiline") {
    // Grows with its text, so it is exactly as tall as the text it replaces.
    return <textarea {...shared} rows={1} className={cn(CONTROL, BOX, "h-auto min-h-7 resize-none py-1 field-sizing-content", className)} />;
  }

  return (
    <input
      {...shared}
      type={control.kind === "number" ? "number" : "text"}
      inputMode={control.kind === "number" ? "numeric" : undefined}
      min={control.kind === "number" ? control.min : undefined}
      max={control.kind === "number" ? control.max : undefined}
      step={control.kind === "number" ? 1 : undefined}
      className={cn(CONTROL, BOX, "h-7", className)}
    />
  );
}
