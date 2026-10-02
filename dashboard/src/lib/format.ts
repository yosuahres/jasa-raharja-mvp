const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export const formatRupiah = (value: number) => rupiah.format(value);

export const formatJuta = (value: number) => {
  const juta = value / 1_000_000;
  return `Rp ${juta.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
};

export const formatRange = (min: number, max: number) => {
  const toJuta = (v: number) => (v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return `Rp ${toJuta(min)} – ${toJuta(max)} jt`;
};

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** "Tipe B" (the hospital's type, not a room class), or null when its document doesn't print it. */
export const kelasLabel = (kelas: string | null) => (kelas ? `Tipe ${kelas}` : null);

/** Facts joined with " · ", skipping the ones that are unknown. */
export const joinFacts = (...facts: (string | null | false | undefined)[]) => facts.filter(Boolean).join(" · ");

export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;
