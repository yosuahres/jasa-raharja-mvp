"use client";

import { ChevronDown, CircleAlert, FileText, Loader2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { discardImport, type SaveState, saveImport, switchHospital } from "@/app/(dashboard)/input/actions";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import type { DetectedField } from "@/lib/data/types";
import { findHospital } from "@/lib/hospital-match";
import { cn } from "@/lib/utils";

import { CategoryRows } from "./category-rows";
import type { ImportPreview as Preview } from "./use-tariff-import";

const EMPTY: SaveState = { error: null };

/**
 * What the extractor read, field by field with where it read it, and every tariff row by
 * category. Nothing is typed; saving creates or updates the hospital.
 */
export function ImportPreview({
  preview,
  hospitals,
  onReprocess,
  onDiscarded,
}: {
  preview: Preview;
  /** Hospitals already in the system, to say whether this one is new. */
  hospitals: { id: string; name: string }[];
  onReprocess: () => void;
  onDiscarded: () => void;
}) {
  const { book, totalRows, flaggedRows } = preview;
  const catalog = useCatalog();
  const profile = book.profile;
  const [state, save, saving] = useActionState(saveImport, EMPTY);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const existing = findHospital(hospitals, profile.name?.value);

  const run = (action: () => Promise<SaveState>, then: () => void) =>
    startTransition(async () => {
      const result = await action();
      setActionError(result.error);
      if (!result.error) then();
    });

  const facilityName = (id: string) => catalog.facilities.find((f) => f.id === id)?.name ?? id;
  const specialtyName = (id: string) => catalog.specialties.find((s) => s.id === id)?.name ?? id;

  return (
    <form action={save} className="grid gap-8">
      <input type="hidden" name="book_id" value={book.id} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{book.fileName}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {totalRows.toLocaleString("id-ID")} baris tarif dibaca
          {flaggedRows > 0 && ` · ${flaggedRows.toLocaleString("id-ID")} kurang jelas`}
          {book.scannedPages.length > 0 && ` · ${book.scannedPages.length} halaman scan dilewati`}
        </span>
      </div>

      <Section title="Rumah sakit" note={existing ? `Sudah terdaftar sebagai ${existing.name}. Tarif dari dokumen ini menjadi tarif terbarunya.` : "Rumah sakit baru."}>
        <Fields>
        {book.documentHospitals.length > 1 && (
          <Row label="Dokumen memuat" source={`${book.documentHospitals.length} rumah sakit. Pilih yang ingin diambil.`}>
            <Picker
              defaultValue={book.facilityFilter ?? ""}
              disabled={busy}
              onChange={(heading) => run(() => switchHospital(book.id, heading), onReprocess)}
              options={book.documentHospitals.map((h) => ({ value: h.heading, label: h.name }))}
            />
          </Row>
        )}
        <Field label="Nama" field={profile.name} />
        <Field label="Kota" field={profile.city} />
        <Field label="Provinsi" field={profile.province} />
        <Field label="Tahun tarif" field={profile.year} format={String} />
        <Field label="Tipe RS" field={profile.kelas} format={(k) => `Tipe ${k}`} />
        <Field label="Kepemilikan" field={profile.ownership} />
        <Field label="Alamat" field={profile.address} />
        <Field label="Mitra PKS" field={profile.partner} format={(p) => (p ? "Ya" : "Tidak")} />
        </Fields>
      </Section>

      <Section title="Fasilitas & tenaga medis" note="Terdeteksi dari layanan yang ada tarifnya di dokumen.">
        <Fields>
        <Row label="Fasilitas" source={book.detectedFacilities.length ? null : "Tidak ada yang terdeteksi"}>
          <Chips items={book.detectedFacilities.map((d) => ({ id: d.id, label: facilityName(d.id), page: d.page }))} />
        </Row>
        <Row label="Tenaga medis" source={book.detectedSpecialties.length ? null : "Tidak ada yang terdeteksi"}>
          <Chips items={book.detectedSpecialties.map((d) => ({ id: d.id, label: specialtyName(d.id), page: d.page }))} />
        </Row>
        </Fields>
      </Section>

      <Section title="Baris tarif" note="Semua baris di dokumen, dikelompokkan menurut jenis layanan.">
        <div className="divide-y overflow-hidden rounded-xl border">
          {CATEGORIES.filter((c) => (book.categoryCounts[c.id] ?? 0) > 0).map((c) => (
            <CategoryRows key={c.id} bookId={book.id} category={c.id} label={c.label} count={book.categoryCounts[c.id] ?? 0} />
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button type="button" variant="ghost" size="lg" disabled={busy || saving} onClick={() => run(() => discardImport(book.id), onDiscarded)}>
          Batal, hapus unggahan
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {(state.error ?? actionError) && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-tier-c-ink">
              <CircleAlert className="size-4 shrink-0" />
              {state.error ?? actionError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy || saving}>
            {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />}
            Simpan
          </Button>
        </div>
      </div>
    </form>
  );
}

function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-px overflow-hidden rounded-xl border bg-border">{children}</dl>;
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** One field: the value read from the document and its source, or a pick when it isn't printed. */
/** One field: the value read from the document and where, or a note that the document doesn't print it. */
function Field<T>({ label, field, format }: { label: string; field: DetectedField<T> | undefined; format?: (value: T) => string }) {
  if (field) {
    return (
      <Row label={label} source={field.source}>
        <span className="font-medium">{format ? format(field.value) : String(field.value)}</span>
      </Row>
    );
  }
  return (
    <Row label={label} source="Tidak tercetak di dokumen" missing>
      <span className="text-muted-foreground">—</span>
    </Row>
  );
}

function Row({ label, source, missing, children }: { label: string; source: string | null; missing?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1 bg-card px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,16rem)] sm:items-center sm:gap-4", missing && "bg-tier-b-soft/40")}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
      {source && <dd className={cn("text-xs text-muted-foreground sm:text-right", missing && "text-tier-b-ink")}>{source}</dd>}
    </div>
  );
}

function Picker({
  options,
  defaultValue,
  disabled,
  onChange,
}: {
  options: { value: string; label: string }[];
  defaultValue: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <span className="relative block max-w-xs">
      <select defaultValue={defaultValue} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none truncate rounded-lg bg-background py-1 pr-9 pl-3 text-sm shadow-[0_0_0_1px_var(--border)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

function Chips({ items }: { items: { id: string; label: string; page: number }[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item.id} title={`Terlihat di hal. ${item.page}`} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
          {item.label}
        </li>
      ))}
    </ul>
  );
}
