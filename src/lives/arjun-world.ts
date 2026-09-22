/** Fictional collaborative puzzle state; never a clinical assessment. */
export type Evidence = 'access' | 'size' | 'time' | 'idea';
export type Person = 'noor' | 'rae';
export interface Option { id: string; name: string; access: boolean; size: number; time: string; revisitTime?: string; feature: boolean }
export interface Scenario { question: string; access: string; size: number; time: string; changedTime: string; idea: string; feature: string; options: Option[] }
export const SCENARIOS: Scenario[] = [
  { question: 'Where can we meet?', access: 'Step-free', size: 6, time: '2pm', changedTime: '10am', idea: 'A quiet break', feature: 'Quiet space', options: [
    { id:'garden', name:'Garden', access:false, size:8, time:'2pm', feature:true },
    { id:'studio', name:'Studio', access:true, size:6, time:'2pm', revisitTime:'10am', feature:false },
    { id:'library', name:'Library', access:true, size:8, time:'10am', feature:true },
  ] },
  { question: 'How can everyone join?', access: 'Captions', size:8, time:'4pm', changedTime:'11am', idea:'Save a recording', feature:'Recording', options:[
    { id:'hybrid', name:'Hybrid room', access:true, size:12, time:'11am', feature:true },
    { id:'small', name:'Small room', access:true, size:4, time:'4pm', feature:true },
    { id:'video', name:'Video room', access:true, size:8, time:'4pm', revisitTime:'11am', feature:false },
  ] },
  { question:'How shall we review?', access:'Readable text', size:4, time:'Friday', changedTime:'Thursday', idea:'Leave comments', feature:'Comments', options:[
    { id:'slides', name:'Slides', access:true, size:6, time:'Friday', revisitTime:'Thursday', feature:false },
    { id:'document', name:'Shared document', access:true, size:8, time:'Thursday', feature:true },
    { id:'voice', name:'Voice memo', access:false, size:4, time:'Friday', feature:true },
  ] },
];
export interface ArjunWorld {
  phase:'meeting'|'setup'|'revisit'|'complete'; scenario:number; paused:boolean;
  known:Evidence[]; board:Evidence[]; parked:Evidence[]; selected:string|null;
  anchor:boolean; owner:Person|null; when:'today'|'tomorrow'|null;
  agreement:{task:'confirm';option:string;owner:Person;when:'today'|'tomorrow'}|null;
  previousOption:string|null; message:string;
}
export type Action = {type:'ask';person:Person}|{type:'pin'|'remove'|'park'|'retrieve';id:Evidence}|
  {type:'select';id:string}|{type:'owner';person:Person}|{type:'when';when:'today'|'tomorrow'}|
  {type:'pause';value:boolean}|{type:'propose'|'anchor'|'continue'|'restart'|'change-owner'};
export function createArjun(scenario=0):ArjunWorld {
  return {phase:'meeting',scenario:scenario%3,paused:false,known:['size','idea'],board:['size','idea'],parked:[],selected:null,anchor:false,owner:null,when:null,agreement:null,previousOption:null,message:'Three spaces. Ask what matters.'};
}
export function label(s:ArjunWorld,id:Evidence):string {
  const c=SCENARIOS[s.scenario]!;
  if(id==='size')return `${c.size} people`;
  if(id==='idea')return c.idea;
  if(!s.known.includes(id))return id==='time'?'Time?':'Access?';
  return id==='access'?c.access:s.phase==='revisit'||s.phase==='complete'?c.changedTime:c.time;
}
export function required(s:ArjunWorld):Evidence[]{return s.phase==='revisit'?['access','time','idea']:['access','size','time']}
export function optionTime(s:ArjunWorld, option:Option):string { return (s.phase==='revisit'||s.phase==='complete') ? option.revisitTime??option.time : option.time }
export function arjunReducer(s:ArjunWorld,a:Action):ArjunWorld {
  if(a.type==='pause')return {...s,paused:a.value};
  if(s.paused)return s;
  if(a.type==='restart')return s.phase==='complete'?createArjun(s.scenario+1):s;
  if(s.phase==='complete')return s;
  const c=SCENARIOS[s.scenario]!;
  if(s.phase==='setup'){
    if(a.type==='anchor')return {...s,anchor:true,message:'The question has a place to return to.'};
    if(a.type==='park'&&a.id==='idea')return {...s,parked:['idea'],board:s.board.filter(id=>id!=='idea'),message:'Your idea stays here for later.'};
    if(a.type==='owner')return {...s,owner:a.person,when:null,message:a.person==='rae'?'Rae: I can follow up tomorrow.':'Noor: I have space today or tomorrow.'};
    if(a.type==='change-owner')return {...s,owner:null,when:null,message:'Agree who has room for this.'};
    if(a.type==='when'&&s.owner){
      if(s.owner==='rae'&&a.when==='today')return {...s,message:'Rae: Today is full. Tomorrow works.'};
      return {...s,when:a.when,message:'Agreed. The action has an owner and a time.'};
    }
    if(a.type==='continue'&&s.anchor&&s.parked.includes('idea')&&s.owner&&s.when&&s.selected)return {
      ...s,phase:'revisit',known:s.known.filter(id=>id!=='time'),previousOption:s.selected,
      agreement:{task:'confirm',option:s.selected,owner:s.owner,when:s.when},
      message:'The plan changed. Rae has an update.',
    };
    return s;
  }
  if(a.type==='ask'){
    const id:Evidence=a.person==='noor'?'access':'time';
    return {...s,known:[...new Set<Evidence>([...s.known,id])],message:a.person==='noor'?`Noor: ${c.access.toLowerCase()} matters.`:s.phase==='revisit'?`Rae: ${c.changedTime} now. Could we use your idea?`:`Rae: We can all join at ${c.time}.`};
  }
  if(a.type==='pin'||a.type==='retrieve'){
    if(!s.known.includes(a.id)||s.board.includes(a.id))return s;
    if(a.type==='retrieve'&&!s.parked.includes(a.id))return s;
    if(s.parked.includes(a.id)&&a.type==='pin')return s;
    if(s.board.length===3)return {...s,message:'Three spaces full. Return a card or park an idea.'};
    return {...s,board:[...s.board,a.id],parked:s.parked.filter(id=>id!==a.id),message:a.type==='retrieve'?'Your saved idea is back on the board.':'One piece of the decision, in view.'};
  }
  if(a.type==='remove')return {...s,board:s.board.filter(id=>id!==a.id),message:'Still available. Just off the working board.'};
  if(a.type==='park'&&a.id==='idea')return {...s,board:s.board.filter(id=>id!=='idea'),parked:['idea'],message:'Saved. The thought can wait here.'};
  if(a.type==='select'&&c.options.some(option=>option.id===a.id))return {...s,selected:a.id,message:'Compare this option with the board.'};
  if(a.type==='propose'){
    if(!s.known.includes('access'))return {...s,message:'Ask Noor what access needs to work.'};
    if(!s.known.includes('time'))return {...s,message:'Ask Rae about the time.'};
    if(required(s).some(id=>!s.board.includes(id)))return {...s,message:s.phase==='revisit'?'Keep access, time and your saved idea in view.':'Keep access, group size and time in view.'};
    const option=c.options.find(o=>o.id===s.selected);
    if(!option)return {...s,message:'Choose an option to connect to the board.'};
    if(!option.access)return {...s,message:`Noor: This misses ${c.access.toLowerCase()}.`};
    if(option.size<c.size)return {...s,message:'There is not room for everyone.'};
    if(optionTime(s,option)!==(s.phase==='revisit'?c.changedTime:c.time))return {...s,message:'Rae: That time does not fit.'};
    if(s.phase==='revisit'&&!option.feature)return {...s,message:`Your idea needs ${c.feature.toLowerCase()}.`};
    if(s.phase==='revisit')return {...s,phase:'complete',agreement:{...s.agreement!,option:option.id},message:'A changed plan. Everyone still has a place.'};
    return {...s,phase:'setup',message:'That fits. Leave a shared next step.'};
  }
  return s;
}
