"use client";

import { Pencil } from "lucide-react";

import { saveProfile } from "@/app/(dashboard)/rumah-sakit/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Hospital } from "@/lib/data/types";

import { FormField, FormSheet, NativeSelect, Textarea } from "./form-sheet";

const OWNERSHIPS: NonNullable<Hospital["ownership"]>[] = ["Pemerintah", "Swasta", "BUMN", "TNI/Polri"];

/** Changes the hospital's own facts, from the Profil section's pencil. */
export function EditProfileSheet({ hospital }: { hospital: Pick<Hospital, "id" | "name" | "ownership" | "city" | "province" | "address" | "beds"> }) {
  return (
    <FormSheet
      trigger={
        <Button variant="ghost" size="icon-xs" aria-label="Ubah profil">
          <Pencil />
        </Button>
      }
      title="Ubah profil"
      action={saveProfile}
      savedMessage="Profil tersimpan"
    >
      <input type="hidden" name="hospital_id" value={hospital.id} />
      <FormField label="Nama rumah sakit" htmlFor="name">
        <Input id="name" name="name" required defaultValue={hospital.name} />
      </FormField>
      <FormField label="Kepemilikan" htmlFor="ownership">
        <NativeSelect id="ownership" name="ownership" defaultValue={hospital.ownership ?? ""}>
          <option value="">Belum diketahui</option>
          {OWNERSHIPS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Tempat tidur" htmlFor="beds">
        <Input id="beds" name="beds" type="number" min={0} step={1} inputMode="numeric" defaultValue={hospital.beds || ""} />
      </FormField>
      <FormField label="Alamat" htmlFor="address">
        <Textarea id="address" name="address" defaultValue={hospital.address} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Kota" htmlFor="city">
          <Input id="city" name="city" defaultValue={hospital.city} />
        </FormField>
        <FormField label="Provinsi" htmlFor="province">
          <Input id="province" name="province" defaultValue={hospital.province} />
        </FormField>
      </div>
    </FormSheet>
  );
}
