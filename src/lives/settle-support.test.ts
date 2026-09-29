import {describe,it,expect} from "vitest";
import {createNina,ninaReducer} from "./nina-world";
import {createJax,jaxReducer} from "./jax-world";
import {createArjun,arjunReducer} from "./arjun-world";
describe("between-round strategies change the next scene",()=>{
 it("closing Nina's tabs removes distractions without writing the words for her",()=>{
  let s=createNina();s={...s,phase:"line-done",draft:[["A first line"]]};
  s=ninaReducer(s,{type:"support",choice:"quiet"});s=ninaReducer(s,{type:"continue"});
  expect(s.chunks.every(c=>c.slot!==null)).toBe(true);expect(s.filled.every(w=>w===null)).toBe(true);
 });
 it("a rough draft gives Nina more space before the next critic blot",()=>{
  let base=createNina();base={...base,phase:"line-done"};
  const prepared=ninaReducer(base,{type:"support",choice:"rough"});
  let s=ninaReducer(prepared,{type:"continue"});s=ninaReducer(s,{type:"dir",dir:"up"});
  for(let i=0;i<100;i++)s=ninaReducer(s,{type:"tick",ms:50});
  expect(s.blotAt-s.t).toBeGreaterThan(7000);
 });
 it("Jax's slower aisle leaves more time, without granting shopping items",()=>{
  let s=createJax();s={...s,phase:"till",basket:["milk"]};
  const chosen=jaxReducer(s,{type:"support",choice:"space"});
  const next=jaxReducer(chosen,{type:"pay"});const ordinary=jaxReducer(s,{type:"pay"});
  let a=next,b=ordinary;for(let i=0;i<20;i++){a=jaxReducer(a,{type:"tick",ms:50});b=jaxReducer(b,{type:"tick",ms:50});}
  expect(a.items[0]!.z).toBeLessThan(b.items[0]!.z);expect(a.basket).toEqual([]);
 });
 it("Arjun's pause gives remarks a longer reading window",()=>{
  const base={...createArjun(),phase:"decided" as const};
  const supported=arjunReducer(arjunReducer(base,{type:"support",choice:"space"}),{type:"continue"});
  const ordinary=arjunReducer(base,{type:"continue"});
  const a=arjunReducer(supported,{type:"tick",ms:700}),b=arjunReducer(ordinary,{type:"tick",ms:700});
  expect(a.stream[0]!.life).toBeGreaterThan(b.stream[0]!.life);expect(a.board.every(p=>p===null)).toBe(true);
 });
 it("strategy buttons cannot change a running or paused round",()=>{
  const n=createNina(),j=createJax(),a=createArjun();
  expect(ninaReducer(n,{type:"support",choice:"quiet"})).toBe(n);
  expect(jaxReducer(j,{type:"support",choice:"list"})).toBe(j);
  expect(arjunReducer(a,{type:"support",choice:"anchor"})).toBe(a);
  const paused={...n,phase:"line-done" as const,paused:true};expect(ninaReducer(paused,{type:"support",choice:"rough"})).toBe(paused);
 });
});
