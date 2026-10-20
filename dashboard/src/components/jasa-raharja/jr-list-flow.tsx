"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { uploadJrList } from "@/app/(dashboard)/input/jr-list-actions";
import { afterKind, ImportShell, type ImportStep } from "@/components/input/import-shell";
import { UploadForm } from "@/components/input/upload-form";
import { buttonVariants } from "@/components/ui/button";

export const JR_LIST_STEPS: ImportStep[] = afterKind([
  { id: 1, label: "Unggah" },
  { id: 2, label: "Periksa tautan" },
]);

/** Where the uploaded list is checked against the hospitals in the app. */
export const JR_REVIEW_HREF = "/input?jenis=daftar-rs&tahap=periksa";

const num = (n: number) => n.toLocaleString("id-ID");

/** Step 2 of the Jasa Raharja list: the same dropzone as a tariff document, for the spreadsheet. */
export function JrListFlow({ current }: { current: { hospitals: number; lokets: number } | null }) {
  const router = useRouter();
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string>();

  const start = (file: File) =>
    startUpload(async () => {
      const data = new FormData();
      data.set("file", file);
      const result = await uploadJrList({ error: null }, data);
      if (result.error) return setError(result.error);
      setError(undefined);
      toast.success(`${num(result.count ?? 0)} rumah sakit tersimpan; ${num(result.linked ?? 0)} rumah sakit di sistem terhubung.`);
      router.push(JR_REVIEW_HREF);
    });

  return (
    <ImportShell crumb="Upload daftar RS Jasa Raharja" steps={JR_LIST_STEPS} current={2}>
      <UploadForm onStart={start} uploading={uploading} uploadError={error} fileType="sheet" before={current && <CurrentList current={current} />} />
    </ImportShell>
  );
}

/** What the app holds now, so the person knows the new sheet replaces it. */
function CurrentList({ current }: { current: { hospitals: number; lokets: number } }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-background px-5 py-3.5">
      <ListChecks className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Daftar saat ini</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {num(current.hospitals)} rumah sakit · {num(current.lokets)} loket
        </p>
      </div>
      <Link href={JR_REVIEW_HREF} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Periksa tautan
      </Link>
    </div>
  );
}
