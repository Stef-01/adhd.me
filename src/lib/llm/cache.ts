// Evals replay paid calls from here for free. The key covers everything that can change an
// answer: model, effort, instructions, schema and input. The route never passes a cache.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Cached, CallJson } from "./client";

export function cacheKey(call: CallJson): string {
  return createHash("sha256")
    .update(JSON.stringify([call.model, call.effort, call.instructions, call.schema, call.input]))
    .digest("hex");
}

export class FileCache {
  constructor(private readonly dir = ".cache/llm") {}

  get(call: CallJson): Cached | undefined {
    const file = join(this.dir, `${cacheKey(call)}.json`);
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Cached) : undefined;
  }

  set(call: CallJson, value: Cached): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, `${cacheKey(call)}.json`), JSON.stringify(value));
  }
}
