import "server-only";

// The extractor worker on the VPS (extractor/app/wake.py). Server-only: the secret never reaches the browser.
const url = process.env.EXTRACTOR_URL;
const secret = process.env.EXTRACTOR_SECRET;
const TIMEOUT_MS = 5000;

/**
 * Tells the worker a book was queued, so it starts now instead of on its next poll. Never throws:
 * when the worker can't be reached the book stays queued and the poll picks it up.
 */
export async function wakeExtractor(): Promise<void> {
  if (!url || !secret) return;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/wake`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.warn(`extractor wake answered ${response.status}`);
  } catch (error) {
    console.warn("extractor wake failed, the worker's poll will pick the book up:", error);
  }
}
