"use client";

import { useState, useTransition } from "react";

import { setJrCode } from "@/app/(dashboard)/input/jr-list-actions";
import type { JrHospital } from "@/lib/data/types";

import { JrSelect } from "./jr-select";

/** One hospital of the app and the row of the list it is linked to; changing it saves at once. */
export function JrLinkRow({ hospitalId, code, list }: { hospitalId: string; code: string; list: JrHospital[] }) {
  const [value, setValue] = useState(code);
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: string) => {
    setValue(next);
    startTransition(async () => {
      const data = new FormData();
      data.set("hospital_id", hospitalId);
      data.set("jr_code", next);
      setError((await setJrCode(data)).error);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <JrSelect list={list} value={value} onChange={change} disabled={saving} />
      {error && <span className="text-xs text-tier-c-ink">{error}</span>}
    </div>
  );
}
