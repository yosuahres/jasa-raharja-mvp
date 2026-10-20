"use client";

import { FileText, Loader2 } from "lucide-react";

import type { UnfinishedUpload } from "@/lib/data/queries";
import type { JrHospital } from "@/lib/data/types";
import { bookYearLabel } from "@/lib/tariff-book";

import { ExtractionFailed, ExtractionProgress } from "./extraction-progress";
import { ImportPreview, type UpdateTarget } from "./import-preview";
import { afterKind, ImportShell, type ImportStep } from "./import-shell";
import { UploadForm } from "./upload-form";
import { type ImportState, useTariffImport } from "./use-tariff-import";

const STEPS: ImportStep[] = [
  { id: 1, label: "Unggah" },
  { id: 2, label: "Baca dokumen" },
  { id: 3, label: "Periksa & simpan" },
];

/** On the Input Data page the kind of data was chosen first, so these come after that step. */
export const TARIFF_STEPS = afterKind(STEPS);

/** The same steps for a new version of one hospital's tariffs; the last one compares before publishing. */
const UPDATE_STEPS: ImportStep[] = [STEPS[0], STEPS[1], { id: 3, label: "Bandingkan & terbitkan" }];

const STEP_OF: Record<ImportState["phase"], number> = {
  idle: 1,
  uploading: 1,
  loading: 2,
  processing: 2,
  failed: 2,
  preview: 3,
};

/**
 * Upload a document, let the worker read it, check what it read, save. With `update`, the document
 * is a new version of that hospital's tariffs: it is bound to the hospital from the upload on, and
 * the last step compares it with the current tariffs before publishing. Without it, the flow comes
 * after the kind-of-data step of the Input Data page.
 */
export function TariffImportFlow({
  hospitals,
  jrHospitals,
  unfinished,
  initialBookId,
  update,
}: {
  hospitals: { id: string; name: string }[];
  /** Jasa Raharja's list of partner hospitals, for the preview to link the hospital to its office. */
  jrHospitals: JrHospital[];
  /** Earlier uploads that weren't saved, to pick up again. */
  unfinished: UnfinishedUpload[];
  initialBookId: string | null;
  update?: UpdateTarget;
}) {
  const { state, start, open, reset } = useTariffImport(initialBookId, update?.hospital.id ?? null);
  const step = STEP_OF[state.phase] + (update ? 0 : 1);
  const fileName = "book" in state ? state.book?.fileName : undefined;

  return (
    <ImportShell
      crumb={update ? `Perbarui tarif ${update.hospital.name}` : "Upload dokumen tarif"}
      fileName={fileName}
      steps={update ? UPDATE_STEPS : TARIFF_STEPS}
      current={step}
    >
      {/* idle and uploading share this element, so the picked file survives a failed upload. */}
      {STEP_OF[state.phase] === 1 && (
        <UploadForm
          onStart={start}
          uploading={state.phase === "uploading"}
          uploadError={state.phase === "idle" ? state.error : undefined}
          unfinished={unfinished}
          description={update ? `Dokumen tarif terbaru ${update.hospital.name}. PDF, maksimal 50 MB.` : undefined}
          before={update && <CurrentTariffs update={update} />}
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
        <ImportPreview preview={state} hospitals={hospitals} jrHospitals={jrHospitals} update={update} onReprocess={() => open(state.book.id)} onDiscarded={reset} />
      )}
    </ImportShell>
  );
}

/** What the hospital has now, so the person knows what the new document will replace. */
function CurrentTariffs({ update }: { update: UpdateTarget }) {
  const book = update.book;
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-background px-5 py-3.5">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Tarif saat ini</p>
        {book ? (
          <>
            <p className="truncate text-sm font-semibold">{book.source}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Versi {book.version} · {bookYearLabel(book)} · {book.rows.toLocaleString("id-ID")} baris tarif
            </p>
          </>
        ) : (
          <p className="text-sm font-medium">Belum ada data tarif terbit</p>
        )}
      </div>
    </div>
  );
}
