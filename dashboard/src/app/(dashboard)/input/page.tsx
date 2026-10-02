import Link from "next/link";

import { TariffImportFlow } from "@/components/input/tariff-import-flow";
import { PageHeader } from "@/components/page-header";
import { getHospitals, getUnfinishedUploads } from "@/lib/data/queries";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const STATUS_LABEL = { queued: "dalam antrean", extracting: "sedang dibaca", review: "belum disimpan", failed: "gagal dibaca" } as const;

export default async function UploadPage({ searchParams }: PageProps<"/input">) {
  const bookId = first((await searchParams).tarif) ?? null;
  const [hospitals, unfinished] = await Promise.all([getHospitals(), getUnfinishedUploads()]);
  const resumable = unfinished.filter((u) => u.id !== bookId);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8">
      <PageHeader title="Upload Dokumen" />
      {/* Keyed by the upload, so opening another one starts its flow fresh. */}
      <TariffImportFlow key={bookId ?? "new"} hospitals={hospitals.map((h) => ({ id: h.id, name: h.name }))} initialBookId={bookId} />
      {!bookId && resumable.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum selesai:{" "}
          {resumable.map((u, i) => (
            <span key={u.id}>
              {i > 0 && ", "}
              <Link href={`/input?tarif=${u.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {u.source}
              </Link>{" "}
              ({STATUS_LABEL[u.status]})
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
