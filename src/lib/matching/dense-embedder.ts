// A dense embedder behind the same `Embedder` interface (Phase M5). Vectors come from an
// OpenAI-compatible `/embeddings` endpoint; the concept layer, which is what the rationale reads
// back, stays lexical, because a dense model has no closed vocabulary to name a reason from.
//
// The interface is synchronous, because every caller is. So the dense embedder is PRIMED: the
// texts it will be asked for (the roster's bios, the narrative) are fetched in batches first,
// and `embed` then reads the cache. A text that was never primed counts as a miss and yields
// the zero vector, the same total behaviour the lexical embedder has for empty text, and the
// miss count is there to be asserted on.
//
// Off unless three variables are set. Nothing is fetched at import time. Narratives are sent to
// the endpoint only when a dense endpoint is configured, which the privacy register records.

import { LexicalEmbedder, type ConceptId, type Embedder } from "./embedding";
import type { Embedding } from "./types";

export interface DenseEndpoint {
  url: string;
  model: string;
  key: string | null;
}

export function denseEndpointFromEnv(env: Record<string, string | undefined> = process.env): DenseEndpoint | null {
  const url = env.ADHDME_EMBED_URL?.trim();
  const model = env.ADHDME_EMBED_MODEL?.trim();
  if (!url || !model) return null;
  return { url, model, key: env.ADHDME_EMBED_KEY?.trim() || null };
}

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class DenseEmbedder implements Embedder {
  dim = 0;
  misses = 0;
  private readonly cache = new Map<string, Embedding>();
  private readonly lexical = new LexicalEmbedder();

  constructor(
    private readonly endpoint: DenseEndpoint,
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
    private readonly batchSize = 64,
  ) {}

  /** Fetch vectors for these texts, in batches; already-cached texts are not sent again. */
  async prime(texts: readonly string[]): Promise<void> {
    const pending = [...new Set(texts.map(normalise))].filter((t) => t.length > 0 && !this.cache.has(t));
    for (let i = 0; i < pending.length; i += this.batchSize) {
      const batch = pending.slice(i, i + this.batchSize);
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.endpoint.key) headers.authorization = `Bearer ${this.endpoint.key}`;
      const response = await this.fetchFn(`${this.endpoint.url.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: this.endpoint.model, input: batch }),
      });
      if (!response.ok) throw new Error(`dense embedder: ${response.status} from ${this.endpoint.url}`);
      const payload = (await response.json()) as { data?: { index?: number; embedding?: number[] }[] };
      const rows = payload.data ?? [];
      if (rows.length !== batch.length) throw new Error(`dense embedder: asked for ${batch.length} vectors, got ${rows.length}`);
      rows.forEach((row, at) => {
        const vector = unit(row.embedding ?? []);
        if (this.dim === 0) this.dim = vector.length;
        if (vector.length !== this.dim) throw new Error(`dense embedder: vector of ${vector.length} in a space of ${this.dim}`);
        this.cache.set(batch[row.index ?? at]!, vector);
      });
    }
  }

  embed(text: string): Embedding {
    const hit = this.cache.get(normalise(text));
    if (hit) return hit;
    this.misses += 1;
    return new Array<number>(this.dim).fill(0);
  }

  concepts(text: string): ConceptId[] {
    return this.lexical.concepts(text);
  }

  get primed(): number {
    return this.cache.size;
  }
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function unit(v: readonly number[]): Embedding {
  let sum = 0;
  for (const x of v) sum += x * x;
  const n = Math.sqrt(sum);
  return n === 0 ? [...v] : v.map((x) => x / n);
}
