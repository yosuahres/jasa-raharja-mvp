// Words that say what kind of hospital it is rather than which one.
const NAME_NOISE = new Set(["RS", "RSU", "RSUD", "RUMAH", "SAKIT", "UMUM", "DAERAH", "DR", "DRS", "H"]);

const nameWords = (name: string) => new Set((name.toUpperCase().match(/[A-Z0-9]+/g) ?? []).filter((w) => !NAME_NOISE.has(w)));

/**
 * Whether two names are the same hospital, as documents write it differently:
 * "RSUD DR. SOEDONO" and "RSUD Dr. Soedono Madiun" are, because one's distinctive words are all in the other.
 */
export const sameHospital = (a: string, b: string) => {
  const [shorter, longer] = [nameWords(a), nameWords(b)].sort((x, y) => x.size - y.size);
  return shorter.size > 0 && [...shorter].every((word) => longer.has(word));
};

export const findHospital = <T extends { name: string }>(hospitals: T[], name: string | undefined) =>
  name ? hospitals.find((h) => sameHospital(h.name, name)) : undefined;

const sameWords = (a: string, b: string) => {
  const [x, y] = [nameWords(a), nameWords(b)];
  return x.size > 0 && x.size === y.size && [...x].every((w) => y.has(w));
};

/** Jasa Raharja's list writes "RSUD SOEDONO, KOTA MADIUN": the hospital, then where it is. */
export const jrNameParts = (name: string) => {
  const at = name.lastIndexOf(",");
  return at < 0 ? { name: name.trim(), place: "" } : { name: name.slice(0, at).trim(), place: name.slice(at + 1).trim() };
};

/**
 * The row of Jasa Raharja's list that is this hospital, by name: an exact match on the distinctive
 * words beats a partial one, and its city breaks ties. Undefined when nothing fits or two rows fit
 * equally, so that a person picks instead.
 */
export const matchJrHospital = <T extends { name: string }>(hospital: { name: string; city: string }, list: T[]): T | undefined => {
  const scored = list.flatMap((row) => {
    const part = jrNameParts(row.name).name;
    const score = sameWords(hospital.name, part) ? 3 : sameHospital(hospital.name, part) ? 2 : sameHospital(hospital.name, row.name) ? 1 : 0;
    if (score === 0) return [];
    const inCity = hospital.city ? row.name.toUpperCase().includes(hospital.city.toUpperCase()) : false;
    return [{ row, score: score * 2 + (inCity ? 1 : 0) }];
  });
  if (scored.length === 0) return undefined;
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  return top.length === 1 ? top[0].row : undefined;
};
