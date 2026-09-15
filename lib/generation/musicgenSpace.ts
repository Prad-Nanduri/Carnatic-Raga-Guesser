/**
 * Experimental ML path: MusicGen via the public Hugging Face Space
 * (facebook/MusicGen) over the Gradio client protocol. Kept behind the
 * "experimental" engine toggle — Spaces are shared, rate-limited, and can
 * sleep; the procedural engine is the default.
 *
 * The Space exposes batched endpoints ("/predict_batched"), not "/predict"
 * — we introspect the API and call the first generation endpoint.
 */

import { Client } from "@gradio/client";

const SPACE = "facebook/MusicGen";
const TIMEOUT_MS = 120_000;

export async function generateViaMusicGen(prompt: string): Promise<Buffer> {
  const token = process.env.HF_API_TOKEN || process.env.HF_TOKEN;
  const client = await Client.connect(SPACE, token ? { hf_token: token as `hf_${string}` } : undefined);

  // Introspect: prefer "/predict_batched" (MusicGen's generation endpoint);
  // fall back to any endpoint whose name starts with "predict".
  const api = (await client.view_api().catch(() => null)) as {
    named_endpoints?: Record<string, { parameters?: unknown[] }>;
  } | null;
  const names = api?.named_endpoints ? Object.keys(api.named_endpoints) : [];
  const endpoint =
    names.find((n) => n === "/predict_batched") ??
    names.find((n) => n.startsWith("/predict")) ??
    "/predict_batched";

  const result = (await Promise.race([
    client.predict(endpoint, [prompt]),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MusicGen Space timed out")), TIMEOUT_MS),
    ),
  ])) as { data: unknown[] };

  const item = result.data?.[0] as { url?: string; data?: string; path?: string } | undefined;
  const url = item?.url ?? item?.data;
  if (!url || typeof url !== "string") throw new Error("MusicGen Space returned no audio URL");

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`MusicGen audio fetch failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
