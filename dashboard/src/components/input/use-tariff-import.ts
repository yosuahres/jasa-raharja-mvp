import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { startExtraction } from "@/app/(dashboard)/input/actions";
import type { CategoryCounts, Detection, DetectedProfile, DocumentHospital } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";
import { TARIFF_BUCKET } from "@/lib/supabase/env";
import { uploadResumable } from "@/lib/supabase/upload";

// How often to ask for extraction progress while the worker runs.
const POLL_MS = 2000;

export type ImportBook = {
  id: string;
  fileName: string;
  status: "queued" | "extracting" | "review" | "published" | "failed";
  error: string | null;
  /** Set once the upload is saved as a hospital's tariffs. */
  hospitalId: string | null;
  pagesTotal: number | null;
  pagesDone: number;
  scannedPages: number[];
  /** The hospital heading extracted from a document that lists several. */
  facilityFilter: string | null;
  profile: DetectedProfile;
  documentHospitals: DocumentHospital[];
  detectedFacilities: Detection[];
  detectedSpecialties: Detection[];
  categoryCounts: CategoryCounts;
};

/** What the preview shows: the book, and how many of its rows there are and how many read unclearly. */
export type ImportPreview = { book: ImportBook; totalRows: number; flaggedRows: number };

export type ImportState =
  | { phase: "idle"; error?: string }
  | { phase: "loading" }
  | { phase: "uploading" }
  | { phase: "processing"; book: ImportBook }
  /** `book` is null when the upload itself couldn't be loaded. */
  | { phase: "failed"; bookId: string; book: ImportBook | null; error: string }
  | ({ phase: "preview" } & ImportPreview);

const BOOK_SELECT =
  "id, source_file, status, error, hospital_id, pages_total, pages_done, scanned_pages, facility_filter, detected_profile, document_hospitals, detected_facilities, detected_specialties, category_counts";

type BookRow = {
  id: string;
  source_file: string;
  status: ImportBook["status"];
  error: string | null;
  hospital_id: string | null;
  pages_total: number | null;
  pages_done: number;
  scanned_pages: number[];
  facility_filter: string | null;
  detected_profile: DetectedProfile;
  document_hospitals: DocumentHospital[];
  detected_facilities: Detection[];
  detected_specialties: Detection[];
  category_counts: CategoryCounts;
};

const toBook = (row: BookRow): ImportBook => ({
  id: row.id,
  fileName: row.source_file,
  status: row.status,
  error: row.error,
  hospitalId: row.hospital_id,
  pagesTotal: row.pages_total,
  pagesDone: row.pages_done,
  scannedPages: row.scanned_pages,
  facilityFilter: row.facility_filter,
  profile: row.detected_profile,
  documentHospitals: row.document_hospitals,
  detectedFacilities: row.detected_facilities,
  detectedSpecialties: row.detected_specialties,
  categoryCounts: row.category_counts,
});

const loadBook = async (id: string) => {
  const { data, error } = await createClient().from("tariff_books").select(BOOK_SELECT).eq("id", id).single<BookRow>();
  if (error) throw new Error(error.message);
  return toBook(data);
};

/** Rows are counted here and loaded a category at a time as the preview opens them. */
const loadPreview = async (book: ImportBook): Promise<ImportPreview> => {
  const supabase = createClient();
  const [total, flagged] = await Promise.all([
    supabase.from("tariff_rows").select("id", { count: "exact", head: true }).eq("book_id", book.id),
    supabase.from("tariff_rows").select("id", { count: "exact", head: true }).eq("book_id", book.id).not("flags", "eq", "{}"),
  ]);
  const error = total.error ?? flagged.error;
  if (error) throw new Error(error.message);
  return { book, totalRows: total.count ?? 0, flaggedRows: flagged.count ?? 0 };
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Upload → extraction by the worker → preview, backed by Supabase. `?tarif=<id>` resumes an upload. */
export function useTariffImport(initialBookId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ImportState>(initialBookId ? { phase: "loading" } : { phase: "idle" });
  // The upload on screen; a load still in flight for another (or after a reset) is dropped.
  const shownId = useRef(initialBookId);

  const setBookParam = useCallback(
    (id: string | null) => router.replace(id ? `${pathname}?tarif=${id}` : pathname, { scroll: false }),
    [router, pathname],
  );

  /** Move to whichever phase the book's status calls for. */
  const enter = useCallback(async (book: ImportBook) => {
    if (book.status === "queued" || book.status === "extracting") setState({ phase: "processing", book });
    else if (book.status === "failed") setState({ phase: "failed", bookId: book.id, book, error: book.error ?? "Ekstraksi gagal." });
    else setState({ phase: "preview", ...(await loadPreview(book)) });
  }, []);

  const open = useCallback(
    (id: string) => {
      shownId.current = id;
      return loadBook(id)
        .then(async (book) => {
          if (shownId.current === id) await enter(book);
        })
        .catch((error) => {
          if (shownId.current === id) setState({ phase: "failed", bookId: id, book: null, error: errorText(error) });
        });
    },
    [enter],
  );

  useEffect(() => {
    if (initialBookId) open(initialBookId);
  }, [initialBookId, open]);

  // Poll the worker's progress until the book leaves the queue.
  const processingId = state.phase === "processing" ? state.book.id : null;
  useEffect(() => {
    if (!processingId) return;
    const timer = window.setInterval(() => open(processingId), POLL_MS);
    return () => window.clearInterval(timer);
  }, [processingId, open]);

  /** Upload the file and queue it; the worker picks it up from there. */
  const start = useCallback(
    async (file: File) => {
      setState({ phase: "uploading" });
      const supabase = createClient();
      try {
        const path = `${crypto.randomUUID()}.pdf`;
        await uploadResumable(TARIFF_BUCKET, path, file).catch((error) => {
          throw new Error(`Upload gagal: ${errorText(error)}`);
        });

        const { data, error } = await supabase
          .from("tariff_books")
          .insert({ source_file: file.name, storage_path: path })
          .select(BOOK_SELECT)
          .single<BookRow>();
        if (error) throw new Error(error.message);
        // Not awaited: the book is queued either way, and the worker's poll is the fallback.
        void startExtraction();

        const book = toBook(data);
        shownId.current = book.id;
        setState({ phase: "processing", book });
        setBookParam(book.id);
      } catch (error) {
        // Nothing was queued, so the picked file stays on the upload step to try again.
        setState({ phase: "idle", error: errorText(error) });
      }
    },
    [setBookParam],
  );

  /** Back to an empty upload. */
  const reset = useCallback(() => {
    shownId.current = null;
    setState({ phase: "idle" });
    setBookParam(null);
    router.refresh();
  }, [setBookParam, router]);

  return { state, start, open, reset };
}
