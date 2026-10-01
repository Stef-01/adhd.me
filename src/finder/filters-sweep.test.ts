// The profile's filters, swept (2026-10-01): every combination of the eight yes/no filters, with a
// kind and a language, on the 53-person roster. A list the filters empty must always offer a way out.
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { BOOLEAN_FILTER_KEYS, emptyFilters, type Filters } from "./filters";
import { searchRoster, waysOut } from "./pipeline";

describe("the filters, swept", () => {
  it("offers a one-tap way out of every empty list up to three filters, over 1,536 combinations", () => {
    let empties = 0;
    const stranded: string[] = [];
    for (let mask = 0; mask < 1 << BOOLEAN_FILTER_KEYS.length; mask++) {
      for (const professions of [[], ["gp"], ["psychologist"]] as const) {
        for (const languages of [[], ["Hindi"]] as const) {
          const filters: Filters = { ...emptyFilters(), professions: [...professions], languages: [...languages] };
          BOOLEAN_FILTER_KEYS.forEach((key, i) => { if (mask & (1 << i)) (filters as unknown as Record<string, unknown>)[key] = true; });
          if (searchRoster(clinicians, filters, "", null).length > 0) continue;
          empties += 1;
          if (waysOut(clinicians, filters, "", null).length === 0) stranded.push(`${BOOLEAN_FILTER_KEYS.filter((_, i) => mask & (1 << i)).join("+")} ${professions.join("")} ${languages.join("")}`);
        }
      }
    }
    expect(empties).toBeGreaterThan(0);
    // Every combination of up to three filters, with a kind and a language, offers a one-tap way out
    // (one filter dropped, or two); past that, Clear, which shows whenever any filter is on.
    const filtersOn = (s: string) => s.split(" ").flatMap((part) => part.split("+")).filter(Boolean).length;
    expect(stranded.filter((s) => filtersOn(s) <= 3)).toEqual([]);
  });
});
