import { FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";

import { Notice, StepHeader } from "./step-layout";
import type { ImportBook } from "./use-tariff-import";

/** Step 2: the extractor worker's progress on one upload, as it reports pages read. */
export function ExtractionProgress({ book }: { book: ImportBook }) {
  const queued = book.status === "queued";
  const total = book.pagesTotal ?? 0;
  const share = total ? Math.min(book.pagesDone / total, 1) : 0;

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
          <Button size="sm" disabled>
            <Loader2 className="animate-spin motion-reduce:animate-none" />
            Lanjutkan
          </Button>
        }
      />

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

/** Step 2 when the document couldn't be read. */
export function ExtractionFailed({ book, error, onReset }: { book: ImportBook | null; error: string; onReset: () => void }) {
  return (
    <>
      <StepHeader
        title="Dokumen tidak terbaca"
        status={{ label: "Gagal", tone: "error" }}
        description="Coba unggah dokumen lain."
        actions={
          <Button size="sm" onClick={onReset}>
            <Upload />
            Unggah dokumen lain
          </Button>
        }
      />
      <div className="grid gap-4">
        {book && <FileCard name={book.fileName} />}
        <Notice tone="error">{error}</Notice>
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
