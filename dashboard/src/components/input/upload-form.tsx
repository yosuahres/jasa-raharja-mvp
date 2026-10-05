import { ChevronRight, CloudUpload, FileText, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { UnfinishedUpload } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

import { Notice, StepHeader } from "./step-layout";

// The storage bucket's limit (supabase/schema.sql).
const MAX_BYTES = 50 * 1024 * 1024;

const STATUS: Record<UnfinishedUpload["status"], { label: string; className: string }> = {
  queued: { label: "Dalam antrean", className: "bg-muted text-muted-foreground" },
  extracting: { label: "Sedang dibaca", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  review: { label: "Belum disimpan", className: "bg-tier-b-soft text-tier-b-ink" },
  failed: { label: "Gagal dibaca", className: "bg-tier-c-soft text-tier-c-ink" },
};

const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`
    : `${(bytes / 1024).toLocaleString("id-ID", { maximumFractionDigits: 0 })} KB`;

/** Step 1: drop or pick a PDF, check it's the right one, then continue to upload it. */
export function UploadForm({
  onStart,
  uploading,
  uploadError,
  unfinished,
}: {
  onStart: (file: File) => void;
  uploading: boolean;
  /** Why the last upload didn't go through. */
  uploadError?: string;
  unfinished: UnfinishedUpload[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (next: File | undefined) => {
    if (!next) return;
    if (!isPdf(next)) return setError(`"${next.name}" bukan PDF.`);
    if (next.size > MAX_BYTES) return setError(`"${next.name}" lebih dari 50 MB.`);
    setError(null);
    setFile(next);
  };

  const clear = () => {
    setFile(null);
    setError(null);
  };

  const shownError = error ?? (file ? uploadError : undefined);

  return (
    <>
      <StepHeader
        title="Pilih dokumen"
        status={file && !shownError ? { label: "Siap", tone: "success" } : undefined}
        description="PDF, maksimal 50 MB. Data rumah sakit dan tarifnya dibaca otomatis."
        actions={
          <Button size="sm" disabled={!file || uploading} onClick={() => file && onStart(file)}>
            {uploading && <Loader2 className="animate-spin motion-reduce:animate-none" />}
            {uploading ? "Mengunggah…" : "Lanjutkan"}
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // Clear so picking the same file again still fires a change.
          e.target.value = "";
        }}
      />
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          // Moving over the zone's own children also fires dragleave.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-20 transition-colors",
          dragging ? "border-primary bg-primary/5" : file ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20",
        )}
      >
        {file ? (
          <div className="flex w-80 max-w-full items-center gap-4 rounded-xl border bg-background px-5 py-3.5 shadow-sm">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{fileSize(file.size)}</p>
            </div>
            <button
              type="button"
              aria-label="Hapus dokumen"
              disabled={uploading}
              onClick={clear}
              className="shrink-0 rounded-md p-1 text-tier-c-ink transition-colors hover:bg-tier-c-soft disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <CloudUpload className="size-10 text-muted-foreground" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {dragging ? (
                "Lepaskan untuk memilih dokumen ini"
              ) : (
                <>
                  Tarik dokumen ke sini atau pilih dari{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="font-semibold text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    perangkat
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {shownError && (
        <div className="mt-4">
          <Notice tone="error">{shownError}</Notice>
        </div>
      )}

      {unfinished.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold">Belum selesai</h3>
          <ul className="divide-y overflow-hidden rounded-lg border bg-background">
            {unfinished.map((u) => (
              <li key={u.id}>
                <Link href={`/input?tarif=${u.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{u.source}</span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS[u.status].className)}>
                    {STATUS[u.status].label}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
