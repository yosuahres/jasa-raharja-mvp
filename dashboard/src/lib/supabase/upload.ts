import { type DetailedError, Upload } from "tus-js-client";

import { createClient } from "./client";
import { supabaseEnv } from "./env";

// Supabase's resumable endpoint only accepts chunks of exactly this size.
const CHUNK_BYTES = 6 * 1024 * 1024;

/**
 * Uploads a file to Storage in resumable chunks, as the signed-in user. One plain request for a
 * large PDF can drop midway on a slow connection ("Load failed"); this retries the dropped chunk
 * and carries on from there instead of failing the whole upload.
 */
export async function uploadResumable(bucket: string, path: string, file: File): Promise<void> {
  const { url, key } = supabaseEnv();
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi berakhir. Masuk lagi lalu unggah ulang.");

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}`, apikey: key, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type || "application/pdf", cacheControl: "3600" },
      chunkSize: CHUNK_BYTES,
      onError: (error) => reject(new Error(storageMessage(error))),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

/** Storage's own message (e.g. a row-level security refusal) rather than tus's request dump. */
const storageMessage = (error: Error | DetailedError) => {
  const body = "originalResponse" in error ? error.originalResponse?.getBody()?.trim() : undefined;
  if (!body) return error.message;
  try {
    const message = JSON.parse(body).message;
    return typeof message === "string" ? message : body;
  } catch {
    // The resumable endpoint answers in plain text.
    return body;
  }
};
