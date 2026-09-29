// The last voice calls, whole, from the finder's record in Supabase (docs/data/FINDER-DATA.md): every
// turn, the request the call wrote, and the search it became (the asks heard, the asks no key
// covers, the clinicians shown). For going back to a call that went wrong (qa/matching/rca.md, R15).
//   node --env-file=.env.local scripts/voice-transcripts.mjs [count] [--json]
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server only; never in a browser build).
const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API), for example in .env.local");
  process.exit(2);
}
const count = Math.min(200, Math.max(1, Number(process.argv[2]) || 10));
const asJson = process.argv.includes("--json");
const headers = { apikey: key, authorization: `Bearer ${key}` };
const rows = async (path) => {
  const reply = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!reply.ok) throw new Error(`${path}: ${reply.status} ${await reply.text()}`);
  return reply.json();
};

const calls = await rows(`voice_calls?select=*&order=created_at.desc&limit=${count}`);
const ids = calls.map((c) => c.search_id).filter(Boolean);
const searches = ids.length ? await rows(`finder_searches?select=*&id=in.(${ids.join(",")})`) : [];
const byId = new Map(searches.map((s) => [s.id, s]));
const joined = calls.map((call) => ({ ...call, search: byId.get(call.search_id) ?? null }));
if (asJson) {
  console.log(JSON.stringify(joined, null, 2));
} else {
  for (const call of joined) {
    console.log(`\n${call.created_at}  ${call.outcome}  ${call.seconds}s  ${call.questions} questions  ${call.model}  device ${String(call.device_id).slice(0, 8)}`);
    for (const turn of call.transcript ?? []) console.log(`  ${turn.who.padEnd(9)} ${turn.text}`);
    if (call.request) console.log(`  request   ${call.request}${call.place ? ` (${call.place})` : ""}`);
    if (call.search) {
      console.log(`  read      ${call.search.read_source}: ${(call.search.asked ?? []).join(", ") || "(nothing)"}`);
      if (call.search.unlisted?.length) console.log(`  unlisted  ${call.search.unlisted.join(" | ")}`);
      console.log(`  shown     ${(call.search.shown ?? []).join(", ")}`);
    }
  }
  console.log(`\n${joined.length} call${joined.length === 1 ? "" : "s"}`);
}
