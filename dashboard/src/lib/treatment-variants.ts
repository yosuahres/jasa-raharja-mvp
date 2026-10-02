import { searchWords } from "./data/rows";

/** One way documents name a treatment, and how many hospitals' documents name it so. */
export type TreatmentVariant = { name: string; hospitals: number; matchedWords: number };

const MAX_VARIANTS = 8;

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Groups found rows by name, so a search can be narrowed to one treatment and its tariffs
 * compared like with like. Names with more of the search's words, in more hospitals, come first.
 */
export const treatmentVariants = (lines: { rawName: string; bookId: string }[], query: string): TreatmentVariant[] => {
  const words = searchWords(query);
  const groups = new Map<string, { name: string; books: Set<string> }>();
  for (const line of lines) {
    const key = normalize(line.rawName);
    if (!key) continue;
    const group = groups.get(key) ?? { name: line.rawName.replace(/\s+/g, " ").trim(), books: new Set<string>() };
    group.books.add(line.bookId);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, { name, books }]) => ({ name, hospitals: books.size, matchedWords: words.filter((w) => key.includes(w)).length }))
    .sort((a, b) => b.matchedWords - a.matchedWords || b.hospitals - a.hospitals || a.name.length - b.name.length)
    .slice(0, MAX_VARIANTS);
};

export const isSameTreatment = (a: string, b: string) => normalize(a) === normalize(b);
