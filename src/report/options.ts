// W107: report options, split out of `weekly.ts` so a request-serving path can read them
// without pulling in `docx`.
//
// `app/console/results/page.tsx` imported `DEFAULT_REPORT_OPTIONS` — three plain numbers —
// from the module that renders the .docx, so a server component loaded an entire document
// library to read a constant. Harmless in itself, and precisely the reasoning the audit
// allowlist rests on: the `image-size` acceptance is argued on "build-time only, never in the
// deployed app", and nothing enforced that for its sibling. `src/security/reachability.test.ts`
// now does.

import { DEFAULT_GUARDRAILS, type Complaint, type GuardrailConfig } from "@/guardrails/monitors";

export interface ReportOptions {
  /** Practice-configurable billing assumption per attended GP visit (AUD). */
  revenuePerAttendedVisit: number;
  guardrails: GuardrailConfig;
  complaints: Complaint[];
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  revenuePerAttendedVisit: 80,
  guardrails: DEFAULT_GUARDRAILS,
  complaints: [],
};
