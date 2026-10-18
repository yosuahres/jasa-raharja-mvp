import type { UnfinishedUpload } from "@/lib/data/queries";

/** Where to pick an unfinished upload up again: on its hospital's update page when it was uploaded as a new version. */
export const uploadHref = (u: Pick<UnfinishedUpload, "id" | "hospitalId">) =>
  u.hospitalId ? `/rumah-sakit/${u.hospitalId}/perbarui?tarif=${u.id}` : `/input?tarif=${u.id}`;
