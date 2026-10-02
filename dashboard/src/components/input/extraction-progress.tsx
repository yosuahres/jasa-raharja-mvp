import { FileText, Loader2 } from "lucide-react";

import { Progress, ProgressLabel } from "@/components/ui/progress";

import type { ImportBook } from "./use-tariff-import";

/** Progress of the extractor worker on one upload, as it reports pages read. */
export function ExtractionProgress({ book }: { book: ImportBook }) {
  const queued = book.status === "queued";
  const total = book.pagesTotal ?? 0;
  const share = total ? Math.min(book.pagesDone / total, 1) : 0;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 py-10">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{book.fileName}</span>
      </div>

      <Progress
        value={queued ? null : share * 100}
        className="gap-2 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:duration-500 [&_[data-slot=progress-indicator]]:ease-out [&_[data-slot=progress-track]]:h-1.5"
      >
        <ProgressLabel className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
          {queued ? "Dalam antrean" : "Membaca rumah sakit dan tarifnya"}
        </ProgressLabel>
        {!queued && total > 0 && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {book.pagesDone.toLocaleString("id-ID")} / {total.toLocaleString("id-ID")} halaman
          </span>
        )}
      </Progress>

      <p aria-live="polite" className="text-xs text-muted-foreground text-pretty">
        {queued
          ? "Dokumen sudah terunggah dan menunggu dibaca. Proses dimulai otomatis."
          : "Anda boleh menutup halaman ini; hasilnya bisa dibuka lagi dari halaman Upload Dokumen."}
      </p>
    </div>
  );
}
