/**
 * Experimental ML path: MusicGen via the public Hugging Face Space
 * (facebook/MusicGen) over the Gradio client protocol. Kept behind the
 * "experimental" engine toggle — Spaces are shared, rate-limited, and can
 * sleep; the procedural engine is the default.
 */

import { Client } from "@gradio/client";

const SPACE = "facebook/MusicGen";
const TIMEOUT_MS = 120_000;

export async function generateViaMusicGen(prompt: string): Promise<Buffer> {
  const token = process.env.HF_API_TOKEN || process.env.HF_TOKEN;
  const client = await Client.connect(SPACE, token ? { hf_token: token as `hf_${string}` } : undefined);

  // The Space's prediction API is introspected at connect time; the
  // canonical endpoint is /predict with a text prompt input.
  const result = (await Promise.race([
    client.predict("/predict", [prompt]),
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
