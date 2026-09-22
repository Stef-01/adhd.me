/** Spatial intentions stay inspectable; fictional play never measures a patient's memory. */
export type Room = 'hall'|'study'|'bedroom'|'living';
export type Item = 'charger'|'parcel'|'keys'|'book';
export type Place = Room|'hand';
export const ROOMS:Room[]=['study','bedroom','hall','living'];
export const NAMES:Record<Room,string>={hall:'Hall',study:'Study',bedroom:'Bedroom',living:'Living room'};
export const ITEMS:Item[]=['charger','parcel','keys','book'];
export const HOMES:Item[]=['charger','parcel','keys'];
export const POINTS:Record<Room,{x:number;y:number}>={study:{x:23,y:34},bedroom:{x:76,y:34},hall:{x:50,y:51},living:{x:25,y:83}};
export interface MiaWorld{
 phase:'encounter'|'setup'|'revisit'|'complete'; scenario:number; room:Room; paused:boolean; moves:number;
 items:Record<Item,Place>; powered:boolean; parcelReady:boolean; request:'waiting'|'offered'|'mia'|'sam'|'done';
 interrupted:boolean; focus:'main'|'request'; homes:Partial<Record<Item,Room>>;
 cue:'portable'|'threshold'|null; owner:'mia'|'sam'|null; cueUses:number;
 firstMoves:number|null; message:string;
}
export type Action={type:'move';room:Room}|{type:'take'|'put';item:Item}|{type:'home';item:Item;room:Room}|{type:'cue';value:'portable'|'threshold'}|{type:'owner';value:'mia'|'sam'}|{type:'pause';value:boolean}|{type:'request';value:'mia'|'sam'}|{type:'power'|'parcel'|'book'|'recall'|'tomorrow'|'restart'};
export function createMia(scenario=0):MiaWorld{
 const layouts:Record<Item,Place>[]=[{charger:'bedroom',parcel:'living',keys:'study',book:'study'},{charger:'living',parcel:'bedroom',keys:'study',book:'study'},{charger:'bedroom',parcel:'study',keys:'living',book:'study'}];
 return {phase:'encounter',scenario:scenario%3,room:'hall',paused:false,moves:0,items:{...layouts[scenario%3]!},powered:false,parcelReady:false,request:'waiting',interrupted:false,focus:'main',homes:{},cue:null,owner:null,cueUses:0,firstMoves:null,message:'Charge the laptop. Leave the parcel by the door.'};
}
export const hands=(s:MiaWorld)=>ITEMS.filter(i=>s.items[i]==='hand');
export const active=(s:MiaWorld)=>s.phase==='encounter'||s.phase==='revisit';
function finish(s:MiaWorld):MiaWorld{
 if(s.powered&&s.parcelReady&&(s.request==='sam'||s.request==='done'))return {...s,phase:s.phase==='revisit'?'complete':'setup',firstMoves:s.firstMoves??s.moves,message:s.phase==='revisit'?'The cue kept the plan in view.':'Done. Give tomorrow’s things a home.'};
 return s;
}
function at(s:MiaWorld,item:Item){return s.items[item]===s.room||s.items[item]==='hand'}
export function miaReducer(s:MiaWorld,a:Action):MiaWorld{
 if(a.type==='pause')return {...s,paused:a.value};if(s.paused)return s;
 if(a.type==='restart')return s.phase==='complete'?createMia(s.scenario+1):s;
 if(s.phase==='setup'){
  if(a.type==='home'&&HOMES.includes(a.item))return {...s,homes:{...s.homes,[a.item]:a.room},message:`${a.item[0]!.toUpperCase()+a.item.slice(1)}: ${NAMES[a.room]}.`};
  if(a.type==='cue')return {...s,cue:a.value,message:a.value==='portable'?'A note that travels with you.':'A note where rooms meet.'};
  if(a.type==='owner')return {...s,owner:a.value,message:a.value==='sam'?'Sam: ‘I’ll bring my book.’':'Mia brings the book. Sam makes space.'};
  if(a.type==='tomorrow'&&HOMES.every(i=>s.homes[i])&&s.cue&&s.owner)return {...createMia(s.scenario),phase:'revisit',homes:s.homes,cue:s.cue,owner:s.owner,firstMoves:s.firstMoves,items:{charger:s.homes.charger!,parcel:s.homes.parcel!,keys:s.homes.keys!,book:'study'},request:s.owner==='sam'?'sam':'mia',message:'Same rooms. Your setup. Sam’s at the door.'};
  return s;
 }
 if(!active(s))return s;
 if(a.type==='cue'&&s.phase==='revisit')return {...s,cue:a.value,focus:a.value==='portable'||s.room==='hall'?'main':s.focus,message:a.value==='portable'?'The cue travels with you now.':'The cue stays at the hallway threshold.'};
 if(a.type==='move'){
  if(a.room===s.room)return s;
  // Every route crosses the hall; a room cannot be reached through a wall.
  if(s.room!=='hall'&&a.room!=='hall')return {...s,message:'Through the hall first.'};
  let next:MiaWorld={...s,room:a.room,moves:s.moves+1,message:NAMES[a.room]+'.'};
  if(!s.interrupted&&next.moves>=2){next={...next,interrupted:true,focus:'request',request:s.phase==='encounter'?'offered':s.request,message:s.phase==='encounter'?'Sam: ‘Could you bring my book too?’':'A knock. Sam asks about tomorrow.'}}
  if(s.cue&&(s.cue==='portable'||a.room==='hall'))next={...next,focus:'main',cueUses:s.cueUses+1,message:next.request==='offered'?next.message:'Your note: charger, parcel, agreed book plan.'};
  return next;
 }
 if(a.type==='recall')return {...s,focus:'main',message:'Laptop: study. Parcel and keys: hall.'};
 if(a.type==='request'){
  if(s.request!=='offered')return s;
  return finish({...s,request:a.value,focus:'main',message:a.value==='sam'?'Sam: ‘Okay, I can collect it.’':'Book added. Two hands; make room when needed.'});
 }
 if(a.type==='take'){
  if(s.items[a.item]!==s.room)return s;
  if(hands(s).length===2)return {...s,message:'Two hands full. Put something down first.'};
  if((a.item==='charger'&&s.powered)||(a.item==='parcel'&&s.parcelReady)||(a.item==='book'&&s.request==='done'))return {...s,message:'That’s already where it needs to be.'};
  return {...s,items:{...s.items,[a.item]:'hand'},message:`${a.item[0]!.toUpperCase()+a.item.slice(1)} in hand.`};
 }
 if(a.type==='put'){
  if(s.items[a.item]!=='hand')return s;
  return {...s,items:{...s.items,[a.item]:s.room},message:`${a.item[0]!.toUpperCase()+a.item.slice(1)} stays in ${NAMES[s.room]}.`};
 }
 if(a.type==='power'){
  if(s.room!=='study'||!at(s,'charger'))return {...s,message:'The charger needs to reach the study.'};
  return finish({...s,powered:true,items:{...s.items,charger:'study'},message:'Laptop charging. One intention finished.'});
 }
 if(a.type==='parcel'){
  if(s.room!=='hall'||!at(s,'parcel'))return {...s,message:'Bring the parcel to the hall.'};
  if(!at(s,'keys'))return {...s,message:'Keys open the parcel cupboard. Bring them here.'};
  return finish({...s,parcelReady:true,items:{...s.items,parcel:'hall',keys:'hall'},message:'Parcel ready. Keys on their hook.'});
 }
 if(a.type==='book'){
  if(s.request!=='mia'||s.room!=='living'||!at(s,'book'))return {...s,message:'Sam’s reading spot is in the living room.'};
  return finish({...s,request:'done',items:{...s.items,book:'living'},message:'Book delivered. Sam takes it from here.'});
 }
 return s;
}
