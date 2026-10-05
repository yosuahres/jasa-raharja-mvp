import {
  Activity,
  Ambulance,
  Bone,
  Brain,
  BrainCircuit,
  Droplet,
  FlaskConical,
  HeartPulse,
  type LucideIcon,
  Magnet,
  Scan,
  ScanLine,
  Scissors,
  Siren,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";

import type { Catalog, Hospital } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const FACILITY_ICON: Record<string, LucideIcon> = {
  igd: Siren,
  ambulans: Ambulance,
  ok: Scissors,
  "c-arm": ScanLine,
  icu: HeartPulse,
  hcu: Activity,
  rontgen: Bone,
  "ct-scan": Scan,
  mri: Magnet,
  lab: FlaskConical,
  "bank-darah": Droplet,
};

const SPECIALTY_ICON: Record<string, LucideIcon> = {
  ortopedi: Bone,
  "bedah-saraf": Brain,
  "bedah-umum": Scissors,
  anestesi: Syringe,
  saraf: BrainCircuit,
  radiologi: ScanLine,
  emergensi: Siren,
};

export type ResourceItem = { id: string; name: string; icon: LucideIcon; present: boolean; value?: string; roundTheClock?: boolean };

/** Every facility the system recognises, marked with whether this hospital has it. */
export const facilityItems = (hospital: Hospital, catalog: Catalog): ResourceItem[] =>
  catalog.facilities.map((f) => {
    const item = hospital.facilities.find((x) => x.facilityId === f.id);
    return {
      id: f.id,
      name: f.name,
      icon: FACILITY_ICON[f.id] ?? Stethoscope,
      present: Boolean(item),
      value: item?.qty ? `${item.qty} unit` : undefined,
      roundTheClock: item?.available24h ?? undefined,
    };
  });

/** Every specialty the system recognises, marked with whether this hospital has it. */
export const staffItems = (hospital: Hospital, catalog: Catalog): ResourceItem[] =>
  catalog.specialties.map((s) => {
    const member = hospital.staff.find((x) => x.specialtyId === s.id);
    return {
      id: s.id,
      name: s.name,
      icon: SPECIALTY_ICON[s.id] ?? Stethoscope,
      present: Boolean(member),
      value: member?.headcount ? `${member.headcount} dokter` : undefined,
      roundTheClock: member?.onCall24h ?? undefined,
    };
  });

/** Facilities or specialists as a compact list; what's missing stays listed, greyed out, so gaps are easy to spot. */
export function ResourceList({ items, roundTheClockLabel }: { items: ResourceItem[]; roundTheClockLabel: string }) {
  return (
    <ul className="divide-y text-sm">
      {items.map((item) => (
        <ResourceRow key={item.id} item={item} roundTheClockLabel={roundTheClockLabel} />
      ))}
    </ul>
  );
}

function ResourceRow({ item, roundTheClockLabel }: { item: ResourceItem; roundTheClockLabel: string }) {
  const Icon = item.present ? item.icon : X;

  return (
    <li className="flex items-center gap-3 py-2">
      <Icon className={cn("size-4 shrink-0", item.present ? "text-muted-foreground" : "text-tier-c")} />
      <span className={cn("min-w-0 flex-1 truncate", !item.present && "text-muted-foreground")}>{item.name}</span>
      {item.present ? (
        <span className="flex shrink-0 items-center gap-3 text-xs">
          {item.value && <span className="tabular-nums">{item.value}</span>}
          <span className={cn("w-24 text-right", item.roundTheClock ? "text-tier-a-ink" : "text-muted-foreground")}>
            {item.roundTheClock ? roundTheClockLabel : "Tidak 24 jam"}
          </span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">Tidak tersedia</span>
      )}
    </li>
  );
}
