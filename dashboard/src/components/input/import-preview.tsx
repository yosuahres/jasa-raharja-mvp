"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { discardImport, type SaveResult, type SaveState, saveImport, switchHospital } from "@/app/(dashboard)/input/actions";
import { useCatalog } from "@/components/catalog-provider";
import { JrSelect } from "@/components/jasa-raharja/jr-select";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import type { DetectedField, JrHospital, TariffBook } from "@/lib/data/types";
import { findHospital, matchJrHospital, sameHospital } from "@/lib/hospital-match";
import { bookYear } from "@/lib/tariff-book";
import { cn } from "@/lib/utils";

import { CategoryRows } from "./category-rows";
import { Notice, StepHeader } from "./step-layout";
import type { ImportPreview as Preview } from "./use-tariff-import";

const EMPTY: SaveResult = { error: null };

const count = (n: number) => n.toLocaleString("id-ID");

/** The hospital a new version of tariffs is for, with what it has now to compare against. */
export type UpdateTarget = {
  hospital: { id: string; name: string; jrCode: string | null };
  book: TariffBook | null;
  facilities: number;
  staff: number;
};

/**
 * Step 3: what the extractor read, field by field with where it read it, and every tariff row by
 * category. Nothing is typed; saving creates or updates the hospital.
 */
export function ImportPreview({
  preview,
  hospitals,
  jrHospitals,
  update,
  onReprocess,
  onDiscarded,
}: {
  preview: Preview;
  /** Hospitals already in the system, to say whether this one is new. */
  hospitals: { id: string; name: string }[];
  /** Jasa Raharja's list of partner hospitals, to link this one to its row and office. */
  jrHospitals: JrHospital[];
  /** Set when this is a new version of one hospital's tariffs: the save goes there, and the preview compares. */
  update?: UpdateTarget;
  onReprocess: () => void;
  onDiscarded: () => void;
}) {
  const { book, totalRows, flaggedRows } = preview;
  const router = useRouter();
  const catalog = useCatalog();
  const profile = book.profile;
  const [state, save, saving] = useActionState(saveImport, EMPTY);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const existing = update?.hospital ?? findHospital(hospitals, profile.name?.value);
  // The row of Jasa Raharja's list: kept from the hospital, else the one the name matches; a person can change it.
  const suggestedJr =
    update?.hospital.jrCode ??
    matchJrHospital({ name: existing?.name ?? profile.name?.value ?? "", city: profile.city?.value ?? "" }, jrHospitals)?.code ??
    "";
  const [jrCode, setJrCode] = useState(suggestedJr);
  const jr = jrHospitals.find((r) => r.code === jrCode);
  // The document names another hospital than the one it is being saved to: worth a look before publishing.
  const otherName = update && profile.name && !sameHospital(update.hospital.name, profile.name.value) ? profile.name.value : null;
  // Saved now, or earlier when an already-saved upload is reopened.
  const savedTo = state.hospitalId ?? (book.status === "published" ? book.hospitalId : null);
  const error = state.error ?? actionError;

  const run = (action: () => Promise<SaveState>, then: () => void) =>
    startTransition(async () => {
      const result = await action();
      setActionError(result.error);
      if (!result.error) then();
    });

  const facilityName = (id: string) => catalog.facilities.find((f) => f.id === id)?.name ?? id;
  const specialtyName = (id: string) => catalog.specialties.find((s) => s.id === id)?.name ?? id;
  const hospitalName = existing?.name ?? profile.name?.value ?? "rumah sakit ini";

  return (
    <form action={save}>
      <input type="hidden" name="book_id" value={book.id} />
      {update && <input type="hidden" name="hospital_id" value={update.hospital.id} />}

      <StepHeader
        title={update ? "Bandingkan & terbitkan" : "Periksa & simpan"}
        status={savedTo ? { label: "Tersimpan", tone: "success" } : undefined}
        description={
          savedTo
            ? `${count(totalRows)} baris tarif tersimpan untuk ${hospitalName}.`
            : `${count(totalRows)} baris tarif dibaca dari ${book.fileName}.`
        }
        actions={
          savedTo ? (
            <Button type="button" size="sm" onClick={() => router.push(`/rumah-sakit/${savedTo}`)}>
              Selesai
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" disabled={busy || saving} onClick={() => run(() => discardImport(book.id), onDiscarded)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={busy || saving}>
                {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                {saving ? "Menyimpan…" : update ? "Terbitkan" : "Simpan"}
              </Button>
            </>
          )
        }
      />

      {!savedTo && book.documentHospitals.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <span className="shrink-0 text-sm font-medium">Rumah sakit</span>
          <Picker
            defaultValue={book.facilityFilter ?? ""}
            disabled={busy || saving}
            onChange={(heading) => run(() => switchHospital(book.id, heading), onReprocess)}
            options={book.documentHospitals.map((h) => ({ value: h.heading, label: h.name }))}
          />
          <span className="text-xs text-muted-foreground">Dokumen memuat {book.documentHospitals.length} rumah sakit.</span>
        </div>
      )}

      <div className="grid gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        {savedTo ? (
          <Notice tone="success">Tarif dari dokumen ini sekarang menjadi tarif terbaru {hospitalName}.</Notice>
        ) : update ? (
          <Notice tone={otherName ? "warning" : "info"}>
            {otherName ? (
              <>
                Dokumen ini menyebut <span className="font-medium">{otherName}</span>, bukan {update.hospital.name}. Periksa dulu sebelum menerbitkan.
              </>
            ) : update.book ? (
              <>
                Menggantikan tarif versi <span className="font-medium text-foreground">{update.book.version}</span> {update.hospital.name}. Versi lama tetap tersimpan sebagai riwayat.
              </>
            ) : (
              <>Menjadi tarif pertama {update.hospital.name}.</>
            )}
          </Notice>
        ) : existing ? (
          <Notice tone="info">
            Sudah terdaftar sebagai <span className="font-medium text-foreground">{existing.name}</span>. Tarif dari dokumen ini menjadi tarif terbarunya.
          </Notice>
        ) : (
          <Notice tone="success">Rumah sakit baru.</Notice>
        )}
        {flaggedRows > 0 && <Notice tone="warning">{count(flaggedRows)} baris kurang jelas terbaca.</Notice>}
        {book.scannedPages.length > 0 && <Notice tone="warning">{count(book.scannedPages.length)} halaman scan dilewati.</Notice>}
      </div>

      {update && !savedTo && <Comparison update={update} book={book} totalRows={totalRows} />}

      <Section title="Rumah sakit">
        <Fields>
          <Field label="Nama" field={profile.name} />
          <Field label="Kota" field={profile.city} />
          <Field label="Provinsi" field={profile.province} />
          <Field label="Tahun tarif" field={profile.year} format={String} />
          <Field label="Kepemilikan" field={profile.ownership} />
          <Field label="Alamat" field={profile.address} />
          {jrHospitals.length > 0 && (
            <Row
              label="Loket Jasa Raharja"
              source={jr ? `${jr.loketName} · kode RS ${jr.code}` : "Pilih dari daftar RS Jasa Raharja"}
              missing={!jr}
            >
              {savedTo ? (
                <span className="font-medium">{jr ? jr.name : "—"}</span>
              ) : (
                <JrSelect list={jrHospitals} value={jrCode} onChange={setJrCode} disabled={busy || saving} />
              )}
            </Row>
          )}
        </Fields>
      </Section>

      <Section title="Fasilitas & tenaga medis">
        <Fields>
          <Row label="Fasilitas" source={book.detectedFacilities.length ? null : "Tidak ada yang terdeteksi"}>
            <Chips items={book.detectedFacilities.map((d) => ({ id: d.id, label: facilityName(d.id), page: d.page }))} />
          </Row>
          <Row label="Tenaga medis" source={book.detectedSpecialties.length ? null : "Tidak ada yang terdeteksi"}>
            <Chips items={book.detectedSpecialties.map((d) => ({ id: d.id, label: specialtyName(d.id), page: d.page }))} />
          </Row>
        </Fields>
      </Section>

      <Section title="Baris tarif">
        <div className="divide-y overflow-hidden rounded-lg border bg-background">
          {CATEGORIES.filter((c) => (book.categoryCounts[c.id] ?? 0) > 0).map((c) => (
            <CategoryRows key={c.id} bookId={book.id} category={c.id} label={c.label} count={book.categoryCounts[c.id] ?? 0} />
          ))}
        </div>
      </Section>
    </form>
  );
}

/** What changes if the new document is published: year, rows by category, facilities and specialists. */
function Comparison({ update, book, totalRows }: { update: UpdateTarget; book: Preview["book"]; totalRows: number }) {
  const current = update.book;
  const currentYear = bookYear(current)?.toString() ?? null;
  const newYear = book.profile.year ? String(book.profile.year.value) : null;
  const categories = CATEGORIES.filter((c) => (current?.categories[c.id] ?? 0) > 0 || (book.categoryCounts[c.id] ?? 0) > 0);

  return (
    <Section title="Perbandingan dengan tarif saat ini">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_5rem] gap-3 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>Data</span>
          <span className="text-right">Saat ini{current && <span className="block font-normal">v{current.version}</span>}</span>
          <span className="text-right">Dokumen baru</span>
          <span className="text-right">Selisih</span>
        </div>
        <dl className="divide-y">
          <CompareLine label="Tahun tarif" before={currentYear} after={newYear} />
          <CompareLine label="Baris tarif" before={current?.rows ?? 0} after={totalRows} strong />
          {categories.map((c) => (
            <CompareLine key={c.id} label={c.label} before={current?.categories[c.id] ?? 0} after={book.categoryCounts[c.id] ?? 0} indent />
          ))}
          <CompareLine label="Fasilitas terdeteksi" before={update.facilities} after={book.detectedFacilities.length} />
          <CompareLine label="Tenaga medis terdeteksi" before={update.staff} after={book.detectedSpecialties.length} />
        </dl>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Fasilitas dan tenaga medis yang sudah tercatat tidak dihapus; yang baru terdeteksi ditambahkan.
      </p>
    </Section>
  );
}

function CompareLine({
  label,
  before,
  after,
  strong,
  indent,
}: {
  label: string;
  before: number | string | null;
  after: number | string | null;
  strong?: boolean;
  indent?: boolean;
}) {
  const numeric = typeof before === "number" && typeof after === "number";
  const delta = numeric ? after - before : null;
  const show = (v: number | string | null) => (v === null ? "—" : typeof v === "number" ? count(v) : v);
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_6rem_6rem_5rem] gap-3 px-4 py-2.5 text-sm", strong && "font-medium")}>
      <dt className={cn("truncate", indent ? "pl-4 text-muted-foreground" : "")}>{label}</dt>
      <dd className="text-right text-muted-foreground tabular-nums">{show(before)}</dd>
      <dd className="text-right tabular-nums">{show(after)}</dd>
      <dd
        className={cn(
          "text-right text-xs tabular-nums",
          delta === null || delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-tier-a-ink" : "text-tier-c-ink",
        )}
      >
        {delta === null ? (before !== after && before !== null ? "berubah" : "") : delta === 0 ? "sama" : `${delta > 0 ? "+" : "−"}${count(Math.abs(delta))}`}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const ROW_GRID = "sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,14rem)] sm:items-center sm:gap-3";

function Fields({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className={cn("hidden border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid", ROW_GRID)}>
        <span>Data</span>
        <span>Hasil baca</span>
        <span className="text-right">Sumber</span>
      </div>
      <dl>{children}</dl>
    </div>
  );
}

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
    <div className={cn("grid gap-1 border-b px-4 py-3 text-sm last:border-b-0", ROW_GRID)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
      {source && <dd className={cn("text-xs text-muted-foreground sm:text-right", missing && "text-amber-700 dark:text-amber-400")}>{source}</dd>}
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
    <Select items={options} defaultValue={defaultValue} disabled={disabled} onValueChange={(next) => next !== null && onChange(next)}>
      <SelectTrigger aria-label="Rumah sakit" className="w-64 max-w-full cursor-pointer bg-background dark:bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
