"use client";

import { Loader2 } from "lucide-react";
import { cloneElement, useActionState, useState } from "react";
import toast from "react-hot-toast";

import type { ActionState } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Notice } from "@/components/input/step-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const EMPTY: ActionState = { error: null };

/**
 * A side sheet holding one form that a server action saves. The trigger opens it without letting
 * the click reach what's around it (a foldable section's summary, a table row). The sheet closes
 * on a save and says so; an error stays in the sheet.
 */
export function FormSheet({
  trigger,
  title,
  description,
  action,
  savedMessage,
  submitLabel = "Simpan",
  secondary,
  children,
}: {
  trigger: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
  title: string;
  description?: string;
  action: (previous: ActionState, data: FormData) => Promise<ActionState>;
  savedMessage: string;
  submitLabel?: string;
  /** Another way to submit the form, e.g. a remove button; it sits left of the main one. */
  secondary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState(async (_previous: ActionState, data: FormData) => {
    const result = await action(EMPTY, data);
    if (!result.error) {
      setOpen(false);
      toast.success(savedMessage);
    }
    return result;
  }, EMPTY);

  const openSheet = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {cloneElement(trigger, { onClick: openSheet })}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <form action={submit} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader className="pr-12">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
              {state.error && <Notice tone="error">{state.error}</Notice>}
              {children}
            </div>
            <SheetFooter className="flex-row justify-end border-t">
              {secondary}
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                {pending ? "Menyimpan…" : submitLabel}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** A labelled control of the form. */
export function FormField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const CONTROL =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/** A plain select, styled like the inputs; it takes part in the form by name. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(CONTROL, "cursor-pointer", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "h-auto min-h-20 resize-y py-1.5", className)} {...props} />;
}
