import { seededRng } from "./random";

export const THEO_ITEMS = {
  keys: { label: "Keys", temptation: "" }, phone: { label: "Phone", temptation: "" }, shoes: { label: "Shoes", temptation: "" },
  wallet: { label: "Wallet", temptation: "" }, pass: { label: "Travel pass", temptation: "" },
  book: { label: "Book", temptation: "Just one chapter…" }, plant: { label: "Plant", temptation: "Maybe repot it first?" },
  laundry: { label: "Laundry", temptation: "One quick load…" }, email: { label: "Email", temptation: "A quick reply became a detour." },
  coffee: { label: "Coffee", temptation: "Time to try that new recipe?" }, controller: { label: "Controller", temptation: "One level. Famous last words." },
} as const;
export type TheoItem = keyof typeof THEO_ITEMS;
export interface TheoPlan { essentials: TheoItem[]; objects: TheoItem[]; duration: number }
export interface TheoState { packed: TheoItem[]; detours: TheoItem[]; outcome: "playing" | "success" | "failure"; message: string }
export const freshTheoState = (): TheoState => ({ packed: [], detours: [], outcome: "playing", message: "Drag what you need onto the launch pad. Or tap to pack." });

export function createTheoPlan(seed: number, level: number): TheoPlan {
  const essentials: TheoItem[] = ["keys", "phone", "shoes"];
  if (level >= 4) essentials.push("wallet");
  if (level >= 7) essentials.push("pass");
  const distractions: TheoItem[] = ["book", "plant", "laundry", "email", "coffee", "controller"];
  const objects = [...essentials, ...distractions.slice(0, level >= 7 ? 6 : level >= 4 ? 4 : 3)];
  const rng = seededRng(seed);
  for (let i = objects.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [objects[i], objects[j]] = [objects[j], objects[i]]; }
  return { essentials, objects, duration: level >= 7 ? 16000 : level >= 4 ? 20000 : 24000 };
}

/** Packing is idempotent; the door is a separate, deliberate final action. */
export function actTheo(plan: TheoPlan, state: TheoState, action: TheoItem | "door"): TheoState {
  if (state.outcome !== "playing") return state;
  if (action === "door") return state.packed.length === plan.essentials.length
    ? { ...state, outcome: "success", message: "Everything you need. Out you go!" }
    : { ...state, message: "A few things are still missing. Check your launch pad." };
  if (!plan.objects.includes(action) || state.packed.includes(action) || state.detours.includes(action)) return state;
  if (plan.essentials.includes(action)) {
    const packed = [...state.packed, action];
    return { ...state, packed, message: packed.length === plan.essentials.length ? "All packed. Open the door!" : `${THEO_ITEMS[action].label} packed. Keep going.` };
  }
  const detours = [...state.detours, action];
  return { ...state, detours, outcome: detours.length === 3 ? "failure" : "playing", message: detours.length === 3 ? "Three detours later… Theo is still at home." : `${THEO_ITEMS[action].temptation} Leave it for later.` };
}
