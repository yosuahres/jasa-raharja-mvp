// Lookups over the catalog loaded from the database (see queries.ts).
import type { Catalog } from "./types";

export const facilityName = (catalog: Catalog, id: string) => catalog.facilities.find((f) => f.id === id)?.name ?? id;
export const specialtyName = (catalog: Catalog, id: string) => catalog.specialties.find((s) => s.id === id)?.name ?? id;
