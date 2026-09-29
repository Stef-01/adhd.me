// The day's paid-call spend on this server instance, shared by every finder route that pays: a new
// meter each UTC day, or when ADHDME_LLM_DAILY_USD changes (default $1). The OpenAI project's own
// budget is the ring outside it.

import { BudgetMeter } from "./meter";

const day = { date: "", meter: new BudgetMeter(0) };

export function todaysMeter(env: Record<string, string | undefined>): BudgetMeter {
  const set = Number(env.ADHDME_LLM_DAILY_USD);
  const cap = env.ADHDME_LLM_DAILY_USD?.trim() && Number.isFinite(set) && set >= 0 ? set : 1;
  const date = new Date().toISOString().slice(0, 10);
  if (day.date !== date || day.meter.capUsd !== cap) Object.assign(day, { date, meter: new BudgetMeter(cap) });
  return day.meter;
}
