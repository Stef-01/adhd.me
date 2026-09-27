// The three rounds both game plans flagged (docs/design/lives-gameplay-upgrade-plan.md §7 and
// docs/design/game-upgrade-v2/PLAN.md), held to what they should teach instead.

import { describe, expect, it } from "vitest";
import { GAMES } from "./games";

const round = (id: string) => GAMES.find((g) => g.id === id)!;

describe("rounds that used to teach the wrong thing", () => {
  it("the sneeze goes into a tissue; nobody is told to hold it in", () => {
    const sneeze = round("sneeze");
    expect(`${sneeze.instruction} ${JSON.stringify(sneeze.config)}`).not.toMatch(/hold it in/i);
    expect(sneeze.config).toMatchObject({ kind: "hold_release", releaseAt: "the sneeze" });
  });

  it("lights out is when you are sleepy, not at a clock time everybody shares", () => {
    const lights = round("leo_lights_out");
    expect(lights.config.kind).toBe("precision_timing");
    if (lights.config.kind !== "precision_timing") return;
    expect(lights.config.marks.join(" ")).not.toMatch(/\d\s*(am|pm)|midnight/i);
    expect(lights.config.marks[lights.config.hitIndex]).toBe("Sleepy");
  });

  it("the spider is watched and let go, never brought closer", () => {
    const spider = round("spider");
    expect(spider.config).toMatchObject({ kind: "inhibition", still: true });
    expect(`${spider.instruction} ${JSON.stringify(spider.config)}`).not.toMatch(/stay still|friend/i);
  });
});
