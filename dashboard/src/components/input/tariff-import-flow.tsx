"use client";

import { Check, CircleAlert, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ExtractionProgress } from "./extraction-progress";
import { ImportPreview } from "./import-preview";
import { UploadForm } from "./upload-form";
import { type ImportBook, type ImportState, useTariffImport } from "./use-tariff-import";

const STEPS = [
  { id: "upload", label: "Unggah" },
  { id: "process", label: "Baca dokumen" },
  { id: "preview", label: "Periksa & simpan" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_OF: Record<ImportState["phase"], StepId> = {
  idle: "upload",
  loading: "upload",
  uploading: "process",
  processing: "process",
  failed: "process",
  preview: "preview",
};

const TITLE: Record<ImportState["phase"], string> = {
  idle: "Unggah dokumen tarif",
  loading: "Memuat…",
  uploading: "Mengunggah",
  processing: "Membaca dokumen",
  failed: "Dokumen tidak terbaca",
  preview: "Periksa hasil baca",
};

/** Upload a document, let the worker read it, check what it read, save. */
export function TariffImportFlow({
  hospitals,
  initialBookId,
}: {
  hospitals: { id: string; name: string }[];
  initialBookId: string | null;
}) {
  const { state, start, open, reset } = useTariffImport(initialBookId);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-0 border-b py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{TITLE[state.phase]}</CardTitle>
          <Steps current={STEP_OF[state.phase]} />
        </div>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:px-6">
        {state.phase === "idle" && <UploadForm onStart={start} />}
        {(state.phase === "loading" || state.phase === "uploading") && (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            {state.phase === "uploading" ? `Mengunggah ${state.fileName}…` : "Memuat…"}
          </p>
        )}
        {state.phase === "processing" && <ExtractionProgress book={state.book} />}
        {state.phase === "failed" && <FailedPanel book={state.book} error={state.error} onReset={reset} />}
        {state.phase === "preview" && (
          <ImportPreview preview={state} hospitals={hospitals} onReprocess={() => open(state.book.id)} onDiscarded={reset} />
        )}
      </CardContent>
    </Card>
  );
}

function Steps({ current }: { current: StepId }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Tahapan">
      {STEPS.map((step, i) => (
        <li key={step.id} className="flex items-center gap-2" aria-current={i === index ? "step" : undefined}>
          {i > 0 && <span aria-hidden className={cn("h-px w-3 bg-border sm:w-6", i <= index && "bg-foreground/40")} />}
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
              i <= index ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            )}
          >
            {i < index ? <Check className="size-3" strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn(i === index ? "font-medium text-foreground" : "hidden text-muted-foreground sm:inline")}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function FailedPanel({ book, error, onReset }: { book: ImportBook | null; error: string; onReset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
      <CircleAlert className="size-8 text-tier-c-ink" />
      <div>
        {book && <p className="font-medium">{book.fileName}</p>}
        <p className="mt-1 text-sm text-tier-c-ink text-pretty">{error}</p>
      </div>
      <Button size="lg" onClick={onReset}>
        <Upload />
        Unggah dokumen lain
      </Button>
    </div>
  );
}
