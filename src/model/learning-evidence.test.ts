import { describe, it, expect } from "vitest";
import { learningEvidence } from "./learning-evidence";
import { emptyProfile, writeProfile, recordResonance, completeModule, markStrategy } from "@/lives/profile";
import { readModel, writeModel, emptyModel, MODEL_KEY } from "./store";
import { deriveNeeds } from "./needs";
const storage = () => { const data = new Map<string,string>(); return { getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => { data.set(k,v); }, removeItem: (k:string) => { data.delete(k); } }; };
describe("learning evidence joins", () => {
  it("never turns score, completion or a saved routine into a deficit", () => {
    const s=storage(); writeProfile(s,{...emptyProfile(),highScore:5,completedModuleIds:["lower_sensory_floor_v1"]});
    completeModule(s,"lower_sensory_floor_v1","lower_sensory_floor",{plan:"Window closed"});
    expect(deriveNeeds(readModel(s))).toEqual([]);
  });
  it("joins explicit game recognition without inventing severity, and retracts a changed answer", () => {
    const s=storage(); recordResonance(s,{sourceType:"game",sourceId:"leo_mosquito",response:"this_is_me"},1);
    const need=deriveNeeds(readModel(s))[0]!;
    expect(need.sources).toEqual(["lives:game:leo_mosquito"]);
    expect(need.functionalCost).toBe(0);
    recordResonance(s,{sourceType:"game",sourceId:"leo_mosquito",response:"not_me"},2);
    expect(deriveNeeds(readModel(s))).toEqual([]);
  });
  it("preserves useful/not useful outcomes without assuming a completed strategy helped", () => {
    const s=storage(); recordResonance(s,{sourceType:"game",sourceId:"leo_mosquito",response:"sometimes"},1);
    completeModule(s,"lower_sensory_floor_v1","lower_sensory_floor",{plan:"Window closed"});
    expect(deriveNeeds(readModel(s))[0]!.strategies[0]!.outcome).toBe("pending");
    markStrategy(s,"lower_sensory_floor","not_useful");
    expect(deriveNeeds(readModel(s))[0]!.strategies[0]!.outcome).toBe("no");
  });
  it("keeps one source of truth and supports old records", () => {
    const s=storage(); writeModel(s,emptyModel());
    recordResonance(s,{sourceType:"character",sourceId:"nina",response:"this_is_me"},1);
    const joined=readModel(s); writeModel(s,joined);
    expect(JSON.parse(s.getItem(MODEL_KEY)!)).not.toHaveProperty("learning");
    expect(deriveNeeds(readModel(s)).some(n=>n.subdomain==="activation")).toBe(true);
  });
  it("rejects unknown sources and uses the latest response per source", () => {
    expect(learningEvidence({...emptyProfile(),resonanceSignals:[
      {sourceType:"game",sourceId:"unknown",response:"this_is_me",createdAt:1},
      {sourceType:"character",sourceId:"nina",response:"not_me",createdAt:3},
      {sourceType:"character",sourceId:"nina",response:"this_is_me",createdAt:1},
    ]})).toEqual([]);
  });
});
