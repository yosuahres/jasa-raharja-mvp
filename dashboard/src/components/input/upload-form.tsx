import { FileUp } from "lucide-react";
import { useId, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The storage bucket's limit (supabase/schema.sql).
const MAX_BYTES = 50 * 1024 * 1024;

const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

/** Drop a PDF or pick one; the upload starts right away. */
export function UploadForm({ onStart }: { onStart: (file: File) => void }) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!isPdf(file)) return setError(`"${file.name}" bukan PDF.`);
    if (file.size > MAX_BYTES) return setError(`"${file.name}" lebih dari 50 MB.`);
    setError(null);
    onStart(file);
  };

  return (
    <div className="grid gap-2">
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="peer sr-only"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          // Clear so picking the same file again still fires a change.
          e.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          // Moving over the label's own children also fires dragleave.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center transition-colors hover:bg-muted/40 peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          dragging && "border-foreground/40 bg-muted/60",
          error && "border-tier-c/50",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
          <FileUp className="size-5" />
        </span>
        <span>
          <span className="block text-base font-medium">{dragging ? "Lepaskan untuk mengunggah" : "Tarik dokumen tarif ke sini"}</span>
          <span className="mt-1 block text-sm text-muted-foreground">PDF, maksimal 50 MB. Data rumah sakit dan tarifnya dibaca otomatis.</span>
        </span>
        <span className={buttonVariants({ size: "lg" })}>Pilih file</span>
      </label>
      {error && (
        <p role="alert" className="text-center text-sm text-tier-c-ink">
          {error}
        </p>
      )}
    </div>
  );
}
