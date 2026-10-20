"use client";

import type { JrHospital } from "@/lib/data/types";
import { jrNameParts } from "@/lib/hospital-match";
import { cn } from "@/lib/utils";

/** The offices of the list, each with its hospitals, in the list's order. */
const byLoket = (list: JrHospital[]) => {
  const groups = new Map<string, { name: string; rows: JrHospital[] }>();
  for (const row of list) {
    const group = groups.get(row.loketCode) ?? { name: row.loketName, rows: [] };
    group.rows.push(row);
    groups.set(row.loketCode, group);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

/** Picks a row of Jasa Raharja's list, grouped by office; "" is no row. A plain select: the list has hundreds of rows. */
export function JrSelect({
  list,
  name = "jr_code",
  value,
  defaultValue,
  onChange,
  disabled,
  className,
}: {
  list: JrHospital[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="Rumah sakit di daftar Jasa Raharja"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
    >
      <option value="">Tidak ada di daftar</option>
      {byLoket(list).map(([code, group]) => (
        <optgroup key={code} label={group.name}>
          {group.rows.map((row) => (
            <option key={row.code} value={row.code}>
              {jrNameParts(row.name).name}
              {jrNameParts(row.name).place && ` · ${jrNameParts(row.name).place}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
