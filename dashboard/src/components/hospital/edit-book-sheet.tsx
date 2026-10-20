"use client";

import { Pencil } from "lucide-react";

import { saveBook } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TariffBook } from "@/lib/data/types";
import { bookYear } from "@/lib/tariff-book";

import { FormField, FormSheet } from "./form-sheet";

/** Changes the published document's version and year, from the Data tarif section's pencil. */
export function EditBookSheet({ book }: { book: TariffBook }) {
  return (
    <FormSheet
      trigger={
        <Button variant="ghost" size="icon-xs" aria-label="Ubah data tarif">
          <Pencil />
        </Button>
      }
      title="Ubah data tarif"
      description={book.source}
      action={saveBook}
      savedMessage="Data tarif tersimpan"
    >
      <input type="hidden" name="book_id" value={book.id} />
      <FormField label="Versi" htmlFor="version">
        <Input id="version" name="version" required defaultValue={book.version} />
      </FormField>
      <FormField label="Tahun tarif" htmlFor="year" hint="Kosongkan bila tidak diketahui.">
        <Input id="year" name="year" type="number" min={1990} max={2100} step={1} inputMode="numeric" defaultValue={bookYear(book) ?? ""} />
      </FormField>
    </FormSheet>
  );
}
