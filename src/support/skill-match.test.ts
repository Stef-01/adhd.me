import { describe, it, expect } from "vitest";
import { matchSkill } from "./skill-match";
import { emptyFilters } from "@/finder/filters";
import { emptyModel, type ModelRecord } from "@/model/store";
import { clinicians, type Clinician } from "@/demo/clinicians";
const provider=(id:string,expertise:Clinician["expertise"], more:Partial<Clinician>={}):Clinician=>({...clinicians[0]!,id,profession:"adhd-coach",expertise,...more});
const record=(): ModelRecord=>({...emptyModel(),resonance:{starting:{cost:8,priority:"yes" as const,at:"2026-09-21"}},answers:{"starting.what-helps-start":["person"]}});
describe("exact skill matching",()=>{
 it("matches declared primary expertise and retains the evidence source",()=>{
  const match=matchSkill([provider("sleep",["sleep-routine"]),provider("start",["task-initiation"])],emptyFilters(),record());
  expect(match?.provider.id).toBe("start"); expect(match?.skill).toBe("task-initiation"); expect(match?.sources).toContain("starting"); expect(match?.basis).toBe("your-answers");
 });
 it("never promotes an unrelated provider or a contributor-only match as the primary skill",()=>{
  expect(matchSkill([provider("sleep",["sleep-routine"])],emptyFilters(),record())).toBeNull();
  expect(matchSkill([provider("study",["university-adhd"])],emptyFilters(),record())).toBeNull();
 });
 it("honours languages, profession, access and care preferences before scoring",()=>{
  const p=provider("start",["task-initiation"],{languages:["English"],wheelchairAccessible:false});
  expect(matchSkill([p],{...emptyFilters(),languages:["Tamil"]},record())).toBeNull();
  expect(matchSkill([p],{...emptyFilters(),professions:["psychologist"]},record())).toBeNull();
  expect(matchSkill([p],{...emptyFilters(),wheelchair:true},record())).toBeNull();
  expect(matchSkill([p],{...emptyFilters(),clinicianIdentity:"aboriginal"},record())).toBeNull();
 });
 it("does not treat a practice topic as a personal disclosure",()=>{
  const match=matchSkill([provider("sleep",["sleep-routine"])],emptyFilters(),emptyModel(),"sleep");
  expect(match?.basis).toBe("this-practice");expect(match?.sources).toEqual([]);
  expect(matchSkill([provider("sleep",["sleep-routine"])],emptyFilters(),emptyModel())).toBeNull();
 });
 it("respects an explicit no-priority answer and has a deterministic tie",()=>{
  const r=record();r.resonance.starting!.priority="no";
  expect(matchSkill([provider("start",["task-initiation"])],emptyFilters(),r)).toBeNull();
  expect(matchSkill([provider("b",["task-initiation"]),provider("a",["task-initiation"])],emptyFilters(),record())?.provider.id).toBe("a");
 });
});
