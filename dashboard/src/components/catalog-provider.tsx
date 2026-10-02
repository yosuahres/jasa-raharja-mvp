"use client";

import { createContext, use } from "react";

import type { Catalog } from "@/lib/data/types";

const CatalogContext = createContext<Catalog | null>(null);

/** Makes the catalog loaded by the dashboard layout available to client components. */
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  const catalog = use(CatalogContext);
  if (!catalog) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return catalog;
}
