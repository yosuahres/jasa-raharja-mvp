import Link from "next/link";

import { StepHeader } from "@/components/input/step-layout";
import { buttonVariants } from "@/components/ui/button";
import type { Hospital, JrHospital } from "@/lib/data/types";

import { JrLinkRow } from "./jr-link-row";

const num = (n: number) => n.toLocaleString("id-ID");

/** The offices of the list, as code and name, in code order. */
export const loketsOf = (list: JrHospital[]) =>
  [...new Map(list.map((r) => [r.loketCode, r.loketName])).entries()].sort((a, b) => a[0].localeCompare(b[0]));

/** Last step of the Jasa Raharja list: its offices, and which hospital of the app links to which row. */
export function JrListSection({ list, hospitals }: { list: JrHospital[]; hospitals: Hospital[] }) {
  const lokets = loketsOf(list);
  const inList = (loketCode: string) => list.filter((r) => r.loketCode === loketCode).length;
  const linked = (loketCode: string) => hospitals.filter((h) => h.jasaRaharja?.loketCode === loketCode).length;

  return (
    <div className="flex flex-col gap-8 [&>:first-child]:mb-0">
      <StepHeader
        title="Periksa tautan"
        status={list.length > 0 ? { label: "Tersimpan", tone: "success" } : undefined}
        description={
          list.length > 0
            ? `${num(list.length)} rumah sakit di ${lokets.length} loket. Unggah lembar kerja terbaru untuk menggantinya.`
            : "Belum ada daftar."
        }
        actions={
          <>
            <Link href="/input?jenis=daftar-rs" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Unggah lagi
            </Link>
            <Link href="/input" className={buttonVariants({ size: "sm" })}>
              Selesai
            </Link>
          </>
        }
      />

      {lokets.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Loket</h3>
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Kode</th>
                  <th className="px-4 py-2.5 text-left font-medium">Loket</th>
                  <th className="px-4 py-2.5 text-right font-medium">RS di daftar</th>
                  <th className="px-4 py-2.5 text-right font-medium">RS dengan data tarif</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lokets.map(([code, name]) => (
                  <tr key={code}>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{code}</td>
                    <td className="px-4 py-2.5 font-medium">{name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(inList(code))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {linked(code) > 0 ? (
                        <Link href={`/rumah-sakit?loket=${encodeURIComponent(name)}`} className="hover:underline">
                          {num(linked(code))}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-semibold">Rumah sakit di sistem</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Tiap rumah sakit dengan data tarif dan barisnya di daftar. Ubah di sini bila tautannya keliru.</p>
        </div>
        {hospitals.length === 0 ? (
          <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Belum ada data</p>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Rumah sakit</th>
                  <th className="px-4 py-2.5 text-left font-medium">Loket</th>
                  <th className="w-72 px-4 py-2.5 text-left font-medium">Baris di daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hospitals.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/rumah-sakit/${h.id}`} className="font-medium hover:underline">
                        {h.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{h.city || "Kota tidak tercetak"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {h.jasaRaharja ? (
                        <>
                          {h.jasaRaharja.loketName}
                          <span className="block text-xs text-muted-foreground tabular-nums">kode RS {h.jasaRaharja.code}</span>
                        </>
                      ) : (
                        <span className="text-tier-c-ink">Belum terhubung</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {list.length > 0 ? <JrLinkRow hospitalId={h.id} code={h.jasaRaharja?.code ?? ""} list={list} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
