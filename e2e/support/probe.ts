// AR10: the probe verdict, shared by every mutation probe (AR9-AR12).
//
// Written in AR9's accent-load.ts and moved here unchanged one unit later, when the touch probe
// became its second caller: the verdict never had anything accent-specific in it — it judges any
// (rule, route, finding-with-probe, finding-without-probe) quadruple — and AR11/AR12 arrive next,
// so leaving it where it was born meant three copies or a semantics probe importing accent
// machinery. One home, two re-exports would have been drift; the AR9 files now import from here.

/**
 * What one probe run established about the detector it drove.
 *
 * `vacuous` is the outcome this lane exists to make impossible to report as a note: a sweep that
 * stayed green while the rule was being broken in front of it is not a passing sweep, it is an
 * absent one. `fires-when-clean` is its mirror and is just as disqualifying — a detector that
 * reports a finding on the unmutated page would have made the `vacuous` check pass for the wrong
 * reason.
 */
export type ProbeVerdict =
  | { readonly kind: "discriminates"; readonly finding: string }
  | { readonly kind: "vacuous"; readonly reason: string }
  | { readonly kind: "fires-when-clean"; readonly reason: string };

export function probeVerdict(
  ruleId: string,
  route: string,
  withProbe: string | null,
  withoutProbe: string | null,
): ProbeVerdict {
  if (withoutProbe !== null) {
    return {
      kind: "fires-when-clean",
      reason: `${ruleId} reported a finding on ${route} with no probe active, so a red run proves nothing: ${withoutProbe}`,
    };
  }
  if (withProbe === null) {
    return {
      kind: "vacuous",
      reason: `${ruleId} stayed green on ${route} while the probe was breaking the rule in front of it — the sweep cannot fail, so it is not a check`,
    };
  }
  return { kind: "discriminates", finding: withProbe };
}
