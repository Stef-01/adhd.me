import {describe,it,expect} from 'vitest';
import {createMia,miaReducer,hands,HOMES,type MiaWorld,type Action,type Room,type Item} from './mia-world';
function acts(s:MiaWorld,...a:Action[]){return a.reduce(miaReducer,s)}
function go(s:MiaWorld,r:Room){if(s.room!==r&&s.room!=='hall')s=miaReducer(s,{type:'move',room:'hall'});return miaReducer(s,{type:'move',room:r})}
function take(s:MiaWorld,i:Item){const r=s.items[i];if(r!=='hand')s=go(s,r);return miaReducer(s,{type:'take',item:i})}
function complete(s=createMia()){
 s=take(s,'charger');s=go(s,'study');s=miaReducer(s,{type:'power'});s=take(s,'keys');s=take(s,'parcel');s=go(s,'hall');s=miaReducer(s,{type:'parcel'});
 if(s.request==='offered')s=miaReducer(s,{type:'request',value:'sam'});
 if(s.request==='mia'){s=take(s,'book');s=go(s,'living');s=miaReducer(s,{type:'book'})}
 return s;
}
describe('Mia spatial intentions',()=>{
 it('all three layouts permit completion without a timer or hidden goals',()=>{for(let n=0;n<3;n++){const s=complete(createMia(n));expect(s.phase).toBe('setup');expect(s.powered&&s.parcelReady).toBe(true)}});
 it('rooms connect through the hall and objects never teleport',()=>{const s=go(createMia(),'study');const blocked=miaReducer(s,{type:'move',room:'bedroom'});expect(blocked.room).toBe('study');expect(blocked.items).toEqual(s.items)});
 it('two carrying slots require staging and preserve objects when put down',()=>{let s=take(take(createMia(),'keys'),'book');s=go(s,'bedroom');s=miaReducer(s,{type:'take',item:'charger'});expect(hands(s)).toHaveLength(2);expect(s.items.charger).toBe('bedroom');s=acts(s,{type:'put',item:'book'},{type:'take',item:'charger'});expect(s.items.book).toBe('bedroom');expect(hands(s)).toEqual(['charger','keys'])});
 it('the parcel depends on keys at the actual point of use',()=>{let s=take(createMia(),'parcel');s=go(s,'hall');s=miaReducer(s,{type:'parcel'});expect(s.parcelReady).toBe(false);s=take(s,'keys');s=go(s,'hall');s=miaReducer(s,{type:'parcel'});expect(s.parcelReady).toBe(true);expect(s.items.keys).toBe('hall')});
 it('an interruption neither deletes the intention nor moves its objects',()=>{const s=createMia();let next=go(go(s,'bedroom'),'hall');expect(next.request).toBe('offered');expect(next.items).toEqual(s.items);expect(miaReducer(next,{type:'recall'}).focus).toBe('main')});
 it('accepting the shared request creates real work, while Sam can own it too',()=>{let s=go(go(createMia(),'study'),'hall');s=miaReducer(s,{type:'request',value:'mia'});s=complete(s);expect(s.phase).toBe('setup');expect(s.items.book).toBe('living');expect(s.request).toBe('done')});
 for(const cue of ['portable','threshold'] as const)it(`${cue} cue survives into a changed encounter and helps return`,()=>{let s=complete();for(const item of HOMES)s=miaReducer(s,{type:'home',item,room:item==='charger'?'study':'hall'});s=acts(s,{type:'cue',value:cue},{type:'owner',value:'sam'},{type:'tomorrow'});expect(s.phase).toBe('revisit');expect(s.items.charger).toBe('study');s=complete(s);expect(s.phase).toBe('complete');expect(s.cueUses).toBeGreaterThan(0);expect(s.moves).toBeLessThan(s.firstMoves!)});
 it('a threshold cue fires only at the hall; a portable cue travels',()=>{let s:MiaWorld={...createMia(),phase:'revisit',cue:'threshold'};s=miaReducer(s,{type:'move',room:'study'});expect(s.cueUses).toBe(0);s=miaReducer(s,{type:'move',room:'hall'});expect(s.cueUses).toBe(1)});
 it('a cue can be repositioned during the revisit without losing objects',()=>{const s:MiaWorld={...createMia(),phase:'revisit',cue:'threshold',focus:'request'};const moved=miaReducer(s,{type:'cue',value:'portable'});expect(moved.items).toEqual(s.items);expect(moved.focus).toBe('main');expect(moved.cue).toBe('portable');expect(miaReducer(createMia(),{type:'cue',value:'portable'}).cue).toBeNull()});
 it('pause, duplicate actions and phase guards cannot lose progress',()=>{let s=take(createMia(),'charger');s=miaReducer(s,{type:'pause',value:true});expect(miaReducer(s,{type:'put',item:'charger'})).toEqual(s);expect(miaReducer(createMia(),{type:'tomorrow'}).phase).toBe('encounter');let done=complete();expect(miaReducer(done,{type:'power'})).toEqual(done);expect(miaReducer(done,{type:'tomorrow'})).toEqual(done)});
});
