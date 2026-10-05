"use client";

import { FileText, Loader2, RotateCw, Upload } from "lucide-react";
import { useState, useTransition } from "react";

import { discardImport, retryExtraction } from "@/app/(dashboard)/input/actions";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";

import { Notice, StepHeader } from "./step-layout";
import type { ImportBook } from "./use-tariff-import";

/** Step 2: the extractor worker's progress on one upload, as it reports pages read. Cancelling drops the upload. */
export function ExtractionProgress({ book, onCancelled }: { book: ImportBook; onCancelled: () => void }) {
  const queued = book.status === "queued";
  const total = book.pagesTotal ?? 0;
  const share = total ? Math.min(book.pagesDone / total, 1) : 0;
  const [cancelling, startTransition] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancel = () =>
    startTransition(async () => {
      const result = await discardImport(book.id);
      setCancelError(result.error);
      if (!result.error) onCancelled();
    });

  return (
    <>
      <StepHeader
        title="Membaca dokumen"
        status={{ label: queued ? "Dalam antrean" : "Diproses", tone: "pending" }}
        description={
          queued
            ? "Dokumen sudah terunggah dan menunggu dibaca. Proses dimulai otomatis."
            : "Halaman ini boleh ditutup; hasilnya bisa dibuka lagi dari halaman Upload Dokumen."
        }
        actions={
          <>
            <Button size="sm" variant="ghost" disabled={cancelling} onClick={cancel}>
              {cancelling && <Loader2 className="animate-spin motion-reduce:animate-none" />}
              Batal
            </Button>
            <Button size="sm" disabled>
              <Loader2 className="animate-spin motion-reduce:animate-none" />
              Lanjutkan
            </Button>
          </>
        }
      />

      {cancelError && (
        <div className="mb-4">
          <Notice tone="error">{cancelError}</Notice>
        </div>
      )}
      <div className="grid gap-6 rounded-xl border bg-background p-6">
        <FileCard name={book.fileName} />
        <Progress
          value={queued ? null : share * 100}
          className="gap-2 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:duration-500 [&_[data-slot=progress-indicator]]:ease-out [&_[data-slot=progress-track]]:h-1.5"
        >
          <ProgressLabel aria-live="polite" className="text-sm font-medium">
            {queued ? "Menunggu giliran" : "Membaca rumah sakit dan tarifnya"}
          </ProgressLabel>
          {!queued && total > 0 && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {book.pagesDone.toLocaleString("id-ID")} / {total.toLocaleString("id-ID")} halaman
            </span>
          )}
        </Progress>
      </div>
    </>
  );
}

/** Step 2 when the document couldn't be read: read it again, or start over with another. */
export function ExtractionFailed({
  book,
  error,
  onRetried,
  onReset,
}: {
  book: ImportBook | null;
  error: string;
  /** Reloads the upload; resolves once it shows its new state. */
  onRetried: () => Promise<void>;
  onReset: () => void;
}) {
  const [retrying, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  // An upload that failed to load is just loaded again; one the extractor failed on is queued again.
  const retry = () =>
    startTransition(async () => {
      const result = book ? await retryExtraction(book.id) : { error: null };
      setRetryError(result.error);
      if (!result.error) await onRetried();
    });

  return (
    <>
      <StepHeader
        title="Dokumen tidak terbaca"
        status={{ label: "Gagal", tone: "error" }}
        description="Coba baca ulang, atau unggah dokumen lain."
        actions={
          <>
            <Button size="sm" variant="outline" disabled={retrying} onClick={onReset}>
              <Upload />
              Unggah dokumen lain
            </Button>
            <Button size="sm" disabled={retrying} onClick={retry}>
              <RotateCw className={retrying ? "animate-spin motion-reduce:animate-none" : undefined} />
              Coba lagi
            </Button>
          </>
        }
      />
      <div className="grid gap-4">
        {book && <FileCard name={book.fileName} />}
        <Notice tone="error">{retryError ?? error}</Notice>
      </div>
    </>
  );
}

function FileCard({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background px-5 py-3.5 shadow-sm">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
    </div>
  );
}
