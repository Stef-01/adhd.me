import { describe, expect, it } from "vitest";
import { actTheo, createTheoPlan, freshTheoState } from "./theo-launch";

describe("Theo's launch pad", () => {
  it("keeps every essential available and makes harder rooms busier, deterministically", () => {
    for (const level of [1, 4, 8]) {
      const plan = createTheoPlan(12, level);
      expect(plan).toEqual(createTheoPlan(12, level));
      expect(new Set(plan.objects).size).toBe(plan.objects.length);
      for (const item of plan.essentials) expect(plan.objects).toContain(item);
    }
    expect(createTheoPlan(12, 1).essentials).toHaveLength(3);
    expect(createTheoPlan(12, 8).essentials).toHaveLength(5);
    expect(createTheoPlan(12, 8).objects).toHaveLength(11);
  });
  it("requires all essentials AND opening the door, ignoring duplicate and late actions", () => {
    const plan = createTheoPlan(5, 8); let state = freshTheoState();
    expect(actTheo(plan, state, "door").outcome).toBe("playing");
    for (const item of plan.essentials) { state = actTheo(plan, state, item); expect(actTheo(plan, state, item)).toBe(state); }
    expect(state.outcome).toBe("playing");
    state = actTheo(plan, state, "door"); expect(state.outcome).toBe("success");
    expect(actTheo(plan, state, "book")).toBe(state);
  });
  it("allows recovery from two unique distractions and ends on a third", () => {
    const plan = createTheoPlan(3, 1); let state = freshTheoState();
    state = actTheo(plan, state, "book"); expect(actTheo(plan, state, "book")).toBe(state);
    state = actTheo(plan, state, "plant"); expect(state.outcome).toBe("playing");
    state = actTheo(plan, state, "laundry"); expect(state.outcome).toBe("failure");
    expect(actTheo(plan, state, "keys")).toBe(state);
  });
});
