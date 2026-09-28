// What the ratings have taught the finder: GET → { weights, visits, quality }. `weights` is a
// multiplier per ask with enough visits on both sides (src/db/learn.ts), `visits` how many it learned
// from, and `quality` a multiplier per clinician with enough rated visits (src/db/quality.ts, the
// founder's "demonstrated quality"): bounded numbers, never a star or a visit. With Supabase
// configured it reads every instance's ratings through the two views; otherwise this instance's.

import { ratings } from "@/db/finder";
import { askSignals, learnAskWeights, type AskSignal } from "@/db/learn";
import { clinicianQuality, clinicianSignals, type ClinicianSignal } from "@/db/quality";

export const dynamic = "force-dynamic";

async function view<Row>(env: Record<string, string | undefined>, name: string): Promise<Row[] | null> {
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const reply = await fetch(`${url}/rest/v1/${name}?select=*`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!reply?.ok) return null;
  return (await reply.json().catch(() => null)) as Row[] | null;
}

async function signals(env: Record<string, string | undefined>): Promise<{ asks: AskSignal[]; clinicians: ClinicianSignal[] }> {
  type AskRow = { key: string; met_n: number; met_stars: number | null; unmet_n: number; unmet_stars: number | null };
  type ClinicianRow = { clinician_id: string; visits: number; stars: number };
  const [askRows, clinicianRows] = await Promise.all([view<AskRow>(env, "facet_rating_signal"), view<ClinicianRow>(env, "clinician_rating_signal")]);
  const local = askRows && clinicianRows ? [] : ratings();
  return {
    asks: askRows?.map((r) => ({ key: r.key, metN: Number(r.met_n), metStars: Number(r.met_stars ?? 0), unmetN: Number(r.unmet_n), unmetStars: Number(r.unmet_stars ?? 0) })) ?? askSignals(local),
    clinicians: clinicianRows?.map((r) => ({ clinicianId: r.clinician_id, visits: Number(r.visits), stars: Number(r.stars) })) ?? clinicianSignals(local),
  };
}

export async function GET() {
  const { asks, clinicians } = await signals(process.env);
  const visits = Math.max(0, ...asks.map((s) => s.metN + s.unmetN));
  return Response.json(
    { weights: learnAskWeights(asks), visits, quality: clinicianQuality(clinicians) },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
