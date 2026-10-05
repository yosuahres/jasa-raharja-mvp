"use client";

import toast from "react-hot-toast";

// Every action reports its outcome the same way: a short success toast, or a longer-lived failure
// toast that says what didn't happen and why.

export type SuccessKind = "saved" | "deleted" | "uploaded" | "done";

export type FailureKind = "save" | "delete" | "upload" | "action";

const SUCCESS: Record<SuccessKind, string> = {
  saved: "Tersimpan",
  deleted: "Terhapus",
  uploaded: "Terunggah",
  done: "Selesai",
};

const SUCCESS_SUBJECT: Record<SuccessKind, string> = {
  saved: "{subject} tersimpan",
  deleted: "{subject} terhapus",
  uploaded: "{subject} terunggah",
  done: "{subject} selesai",
};

const FAILURE: Record<FailureKind, string> = {
  save: "Gagal menyimpan, tidak ada yang berubah",
  delete: "Gagal menghapus, tidak ada yang berubah",
  upload: "Gagal mengunggah",
  action: "Terjadi kesalahan, coba lagi",
};

const SUCCESS_DURATION = 2500;
const FAILURE_DURATION = 6000;

export function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

export function notifySuccess(kind: SuccessKind, subject?: string, dedupeId?: string): string {
  const message = subject ? SUCCESS_SUBJECT[kind].replace("{subject}", subject) : SUCCESS[kind];
  return toast.success(message, { duration: SUCCESS_DURATION, id: dedupeId });
}

export function notifyError(kind: FailureKind, error?: unknown, dedupeId?: string): string {
  const base = FAILURE[kind];
  const reason = errorMessage(error);
  return toast.error(reason && reason !== base ? `${base}: ${reason}` : base, {
    duration: FAILURE_DURATION,
    id: dedupeId,
  });
}
