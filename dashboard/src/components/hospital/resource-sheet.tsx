"use client";

import { Pencil, Plus } from "lucide-react";

import { saveResource } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FormField, FormSheet, NativeSelect } from "./form-sheet";

export type ResourceKind = "fasilitas" | "tenaga-medis";

const COPY: Record<ResourceKind, { title: string; item: string; count: string; countUnit: string; roundTheClock: string }> = {
  fasilitas: { title: "Fasilitas", item: "Fasilitas", count: "Jumlah unit", countUnit: "unit", roundTheClock: "Tersedia 24 jam" },
  "tenaga-medis": { title: "Tenaga medis", item: "Spesialisasi", count: "Jumlah dokter", countUnit: "dokter", roundTheClock: "On-call 24 jam" },
};

/** What the hospital already has of it, when editing. */
export type ResourceValue = { count: number | null; roundTheClock: boolean | null };

/**
 * Adds a facility or specialist to the hospital, or changes one it has. With `itemId` the sheet is
 * about that one item; without it, the person picks one from the catalog.
 */
export function ResourceSheet({
  hospitalId,
  kind,
  options,
  itemId,
  value,
}: {
  hospitalId: string;
  kind: ResourceKind;
  options: { id: string; name: string }[];
  itemId?: string;
  value?: ResourceValue;
}) {
  const copy = COPY[kind];
  const editing = Boolean(value);
  const item = options.find((o) => o.id === itemId);
  const trigger = editing ? (
    <Button variant="ghost" size="icon-xs" aria-label={`Ubah ${item?.name ?? ""}`}>
      <Pencil />
    </Button>
  ) : itemId ? (
    <Button variant="ghost" size="xs" className="text-muted-foreground">
      <Plus data-icon="inline-start" />
      Tambah
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Plus data-icon="inline-start" />
      Tambah {kind === "fasilitas" ? "fasilitas" : "tenaga medis"}
    </Button>
  );

  return (
    <FormSheet
      trigger={trigger}
      title={editing ? `Ubah ${item?.name ?? copy.item.toLowerCase()}` : `Tambah ${copy.title.toLowerCase()}`}
      description={editing ? undefined : `${copy.item} yang dimiliki rumah sakit ini.`}
      action={saveResource}
      savedMessage={`${copy.title} tersimpan`}
      secondary={
        editing && (
          <Button type="submit" name="intent" value="hapus" variant="destructive" className="mr-auto">
            Hapus
          </Button>
        )
      }
    >
      <input type="hidden" name="hospital_id" value={hospitalId} />
      <input type="hidden" name="kind" value={kind} />
      {itemId ? (
        <input type="hidden" name="item_id" value={itemId} />
      ) : (
        <FormField label={copy.item} htmlFor="item_id">
          <NativeSelect id="item_id" name="item_id" defaultValue="" required>
            <option value="" disabled>
              Pilih…
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}
      {itemId && editing && <p className="text-sm font-medium">{item?.name}</p>}
      <FormField label={copy.count} htmlFor="count" hint="Kosongkan bila belum diketahui.">
        <Input id="count" name="count" type="number" min={0} step={1} inputMode="numeric" defaultValue={value?.count ?? ""} placeholder={copy.countUnit} />
      </FormField>
      <FormField label={copy.roundTheClock} htmlFor="round_the_clock">
        <NativeSelect id="round_the_clock" name="round_the_clock" defaultValue={value?.roundTheClock === true ? "ya" : value?.roundTheClock === false ? "tidak" : ""}>
          <option value="">Belum diketahui</option>
          <option value="ya">Ya</option>
          <option value="tidak">Tidak</option>
        </NativeSelect>
      </FormField>
    </FormSheet>
  );
}
