"use client";

import { Check, Loader2 } from "lucide-react";

import type { UnfinishedUpload } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

import { ExtractionFailed, ExtractionProgress } from "./extraction-progress";
import { ImportPreview } from "./import-preview";
import { UploadForm } from "./upload-form";
import { type ImportState, useTariffImport } from "./use-tariff-import";

const STEPS = [
  { id: 1, label: "Unggah" },
  { id: 2, label: "Baca dokumen" },
  { id: 3, label: "Periksa & simpan" },
] as const;

type Step = (typeof STEPS)[number]["id"];

const STEP_OF: Record<ImportState["phase"], Step> = {
  idle: 1,
  uploading: 1,
  loading: 2,
  processing: 2,
  failed: 2,
  preview: 3,
};

/** Upload a document, let the worker read it, check what it read, save. */
export function TariffImportFlow({
  hospitals,
  unfinished,
  initialBookId,
}: {
  hospitals: { id: string; name: string }[];
  /** Earlier uploads that weren't saved, to pick up again. */
  unfinished: UnfinishedUpload[];
  initialBookId: string | null;
}) {
  const { state, start, open, reset } = useTariffImport(initialBookId);
  const step = STEP_OF[state.phase];
  const fileName = "book" in state ? state.book?.fileName : undefined;

  return (
    // Fills the shell's panel below its 48px header (plus the panel's 8px top and bottom inset on large screens).
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col lg:min-h-[calc(100dvh-4rem)]">
      {/* Equal side columns keep the steps centered and stop the breadcrumb short of them. */}
      <div className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b px-4">
        <p className="hidden truncate text-sm lg:block">
          <span className="text-muted-foreground">Upload dokumen</span>
          {fileName && (
            <>
              <span className="mx-1.5 text-muted-foreground">/</span>
              <span className="font-semibold">{fileName}</span>
            </>
          )}
        </p>
        <Steps current={step} />
      </div>

      <div className="flex-1 bg-muted/30 px-4 py-8 sm:px-8 lg:rounded-b-xl">
        <div className="mx-auto max-w-2xl">
          {/* idle and uploading share this element, so the picked file survives a failed upload. */}
          {step === 1 && (
            <UploadForm
              onStart={start}
              uploading={state.phase === "uploading"}
              uploadError={state.phase === "idle" ? state.error : undefined}
              unfinished={unfinished}
            />
          )}
          {state.phase === "loading" && (
            <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              Memuat…
            </p>
          )}
          {state.phase === "processing" && <ExtractionProgress book={state.book} onCancelled={reset} />}
          {state.phase === "failed" && (
            <ExtractionFailed book={state.book} error={state.error} onRetried={() => open(state.bookId)} onReset={reset} />
          )}
          {state.phase === "preview" && (
            <ImportPreview preview={state} hospitals={hospitals} onReprocess={() => open(state.book.id)} onDiscarded={reset} />
          )}
        </div>
      </div>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  return (
    <ol className="col-start-2 flex items-center" aria-label="Tahapan">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center" aria-current={s.id === current ? "step" : undefined}>
          {i > 0 && <span aria-hidden className={cn("mx-1.5 h-px w-4 sm:mx-3 sm:w-12", s.id <= current ? "bg-primary" : "bg-border")} />}
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                s.id <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {s.id < current ? <Check className="size-3" strokeWidth={3} /> : s.id}
            </span>
            <span
              className={cn(
                "text-sm whitespace-nowrap",
                s.id === current ? "font-medium text-foreground max-sm:sr-only" : "hidden text-muted-foreground lg:inline",
              )}
            >
              {s.label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
