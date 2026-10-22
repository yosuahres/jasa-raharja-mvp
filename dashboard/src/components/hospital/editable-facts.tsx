"use client";

import { type BookField, type ProfileField, saveBookField, saveProfileField } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { OWNERSHIPS } from "@/lib/data/types";

import { type InlineControl, InlineEdit } from "./inline-edit";

type Fact = { label: string; control: InlineControl; display?: (value: string) => React.ReactNode; empty?: React.ReactNode };

const count = (value: string) => <span className="tabular-nums">{Number(value).toLocaleString("id-ID")}</span>;

const PROFILE: Record<ProfileField, Fact> = {
  name: { label: "Nama rumah sakit", control: { kind: "text" } },
  ownership: {
    label: "Kepemilikan",
    control: { kind: "choice", options: [{ value: null, label: "Belum diketahui" }, ...OWNERSHIPS.map((o) => ({ value: o, label: o }))] },
  },
  beds: { label: "Tempat tidur", control: { kind: "number", min: 0 }, display: count },
  address: { label: "Alamat", control: { kind: "multiline" } },
  city: { label: "Kota", control: { kind: "text" } },
  province: { label: "Provinsi", control: { kind: "text" } },
};

/** One of the hospital's own facts, edited where it's shown. */
export function ProfileFact({ hospitalId, field, value, className }: { hospitalId: string; field: ProfileField; value: string; className?: string }) {
  return <InlineEdit {...PROFILE[field]} value={value} className={className} save={(next) => saveProfileField(hospitalId, field, next)} />;
}

const BOOK: Record<BookField, Fact> = {
  version: { label: "Versi", control: { kind: "text" } },
  year: { label: "Tahun tarif", control: { kind: "number", min: 1990, max: 2100 }, empty: "Tidak tercetak di dokumen" },
};

/** The published document's version or year, edited where it's shown. */
export function BookFact({ bookId, field, value }: { bookId: string; field: BookField; value: string }) {
  return <InlineEdit {...BOOK[field]} value={value} save={(next) => saveBookField(bookId, field, next)} />;
}
