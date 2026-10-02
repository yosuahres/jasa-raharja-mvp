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
