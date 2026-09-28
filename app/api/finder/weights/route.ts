// What the ratings have taught the finder (src/db/learn.ts): GET → { weights, visits }, a multiplier
// per ask that has enough visits on both sides, and how many visits it learned from. Per ask, never
// per clinician; nothing about any visit leaves. With Supabase configured it reads every instance's
// ratings from the facet_rating_signal view; otherwise this instance's.

import { ratings } from "@/db/finder";
import { askSignals, learnAskWeights, type AskSignal } from "@/db/learn";

export const dynamic = "force-dynamic";

async function fromSupabase(env: Record<string, string | undefined>): Promise<AskSignal[] | null> {
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const reply = await fetch(`${url}/rest/v1/facet_rating_signal?select=*`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!reply?.ok) return null;
  const rows = (await reply.json().catch(() => [])) as { key: string; met_n: number; met_stars: number | null; unmet_n: number; unmet_stars: number | null }[];
  return rows.map((r) => ({ key: r.key, metN: Number(r.met_n), metStars: Number(r.met_stars ?? 0), unmetN: Number(r.unmet_n), unmetStars: Number(r.unmet_stars ?? 0) }));
}

export async function GET() {
  const signals = (await fromSupabase(process.env)) ?? askSignals(ratings());
  const visits = Math.max(0, ...signals.map((s) => s.metN + s.unmetN));
  return Response.json({ weights: learnAskWeights(signals), visits }, { headers: { "Cache-Control": "public, max-age=300" } });
}
