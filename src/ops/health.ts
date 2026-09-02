// U4 (O229): what `/api/health` says. A deploy check and an uptime monitor need one answer that
// proves the process is the build they expect and has been up since when: the commit (null for a
// local build, where Vercel exposed nothing), the boot instant derived from the process's own
// uptime rather than a global written at register time, the store adapter this build persists
// through, and the reporter sink in use. The store kind is a literal until U17–U19 give the tree
// an adapter to ask; writing it here keeps the endpoint's shape stable across that change.

import { commitSha, selectSink } from "./reporter";

export interface Health {
  readonly ok: true;
  readonly sha: string | null;
  readonly bootedAt: string;
  readonly store: "jsonl-file";
  readonly reporter: string;
}

export function health(now: number = Date.now(), uptimeSeconds: number = process.uptime()): Health {
  return {
    ok: true,
    sha: commitSha(),
    bootedAt: new Date(now - uptimeSeconds * 1000).toISOString(),
    store: "jsonl-file",
    reporter: selectSink().name,
  };
}
