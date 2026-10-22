"use client";

import { Plus } from "lucide-react";

import { addTariffRow } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/categories";

import { FormDialog, FormField, NativeSelect } from "./form-dialog";

/** Types a tariff row in, to go with the hospital's document (or start one when it has none). */
export function TariffRowDialog({ hospitalId, hasBook }: { hospitalId: string; hasBook: boolean }) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Tambah baris
        </Button>
      }
      title="Tambah baris tarif"
      description={hasBook ? "Baris ini masuk ke data tarif yang terbit sekarang." : "Rumah sakit ini belum punya data tarif; baris ini memulainya."}
      action={addTariffRow}
      savedMessage="Baris tarif tersimpan"
    >
      <input type="hidden" name="hospital_id" value={hospitalId} />
      <FormField label="Nama tindakan atau layanan" htmlFor="name">
        <Input id="name" name="name" required autoFocus placeholder="mis. Kraniotomi" />
      </FormField>
      <FormField label="Jenis layanan" htmlFor="category">
        <NativeSelect id="category" name="category" defaultValue="tindakan">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Tarif (Rp)" htmlFor="amount">
        <Input id="amount" name="amount" type="number" min={1} step={1} inputMode="numeric" required placeholder="1500000" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Kelas" htmlFor="kelas" hint="Kosongkan bila satu tarif.">
          <Input id="kelas" name="kelas" placeholder="mis. Kelas I" />
        </FormField>
        <FormField label="Satuan" htmlFor="unit">
          <Input id="unit" name="unit" placeholder="mis. /tindakan" />
        </FormField>
      </div>
    </FormDialog>
  );
}
