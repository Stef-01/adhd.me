"use client";
import Link from 'next/link';
import {useEffect,useReducer,useRef,useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {ArrowLeft,Pause,Play,Check} from '@phosphor-icons/react';
import {createMia,miaReducer,ROOMS,NAMES,ITEMS,HOMES,POINTS,hands,active,type Item,type Room} from '@/lives/mia-world';
const art='/games/next-three/mia/';
const props:Record<Item,string>={charger:art+'props/charger-loose.svg',parcel:art+'props/parcel-sealed.svg',keys:'/games/v2/props/keys.svg',book:'/games/v2/props/book-closed.svg'};
const labels:Record<Item,string>={charger:'Charger',parcel:'Parcel',keys:'Keys',book:'Book'};
const roomLabels:Record<Room,{x:number;y:number}>={study:{x:24,y:12},bedroom:{x:76,y:12},hall:{x:82,y:51},living:{x:26,y:62}};
function ItemArt({item}:{item:Item}){return <img src={props[item]} alt="" draggable={false}/>}
export function MiaWorldGame(){
 const [s,dispatch]=useReducer(miaReducer,undefined,()=>createMia());const [plan,setPlan]=useState(false);const reduced=useReducedMotion();const heading=useRef<HTMLHeadingElement>(null);const previous=useRef(s.phase);
 useEffect(()=>{if(previous.current!==s.phase){heading.current?.focus({preventScroll:true});previous.current=s.phase;setPlan(false)}},[s.phase]);
 useEffect(()=>{const hide=()=>{if(document.hidden)dispatch({type:'pause',value:true})};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 const carried=hands(s),live=active(s),nextHome=HOMES.find(i=>!s.homes[i]);const position=POINTS[s.room];
 const title=s.phase==='encounter'?'What did I come for?':s.phase==='setup'?'Leave a clue for later.':s.phase==='revisit'?'The room remembers.':'A little less to hold.';
 return <section className="mw-game lives-run" data-phase={s.phase} data-room={s.room} data-paused={s.paused} data-hands={carried.join(',')} aria-labelledby="mw-title">
 <nav className="mw-nav" aria-label="Game navigation"><Link href="/approach?pane=games" aria-label="Back to games"><ArrowLeft size={22}/></Link><span>Mia · Remember why</span><button aria-label={s.paused?'Resume game':'Pause game'} onClick={()=>dispatch({type:'pause',value:!s.paused})}>{s.paused?<Play size={20}/>:<Pause size={20}/>}</button></nav>
 <header className="mw-heading"><h1 ref={heading} tabIndex={-1} id="mw-title">{title}</h1>{live&&<button aria-expanded={plan} onClick={()=>{setPlan(!plan);dispatch({type:'recall'})}}>The plan</button>}</header>
 <div className="mw-layout">
 <div className="mw-house" aria-label="Mia’s connected rooms">
 <picture className="mw-layer"><source media="(max-width: 700px)" srcSet={art+'scenes/phone/background.svg'}/><img alt="" src={art+'scenes/desktop/background.svg'}/></picture><picture className="mw-layer"><source media="(max-width: 700px)" srcSet={art+'scenes/phone/furniture.svg'}/><img alt="" src={art+'scenes/desktop/furniture.svg'}/></picture>
 {ROOMS.map(room=><button className="mw-room" key={room} aria-label={s.phase==='setup'&&nextHome?`Give ${labels[nextHome]} a home in ${NAMES[room]}`:`Go to ${NAMES[room]}`} aria-pressed={live?s.room===room:undefined} disabled={s.paused||(!live&&!(s.phase==='setup'&&nextHome))||(live&&s.room!=='hall'&&room!=='hall'&&s.room!==room)} style={{left:roomLabels[room].x+'%',top:roomLabels[room].y+'%'}} onClick={()=>s.phase==='setup'&&nextHome?dispatch({type:'home',item:nextHome,room}):dispatch({type:'move',room})}>{NAMES[room]}</button>)}
 {live&&ITEMS.filter(item=>s.items[item]!=='hand').map(item=>{const p=POINTS[s.items[item] as Room];const peers=ITEMS.filter(i=>s.items[i]===s.items[item]);const slot=peers.indexOf(item);return <span className="mw-world-object" key={item} style={{left:(p.x+(slot%2?7:-7))+'%',top:(p.y+7+Math.floor(slot/2)*12)+'%'}} aria-hidden="true"><ItemArt item={item}/></span>})}
 {s.phase==='setup'&&nextHome&&<div className="mw-home-object" aria-hidden="true"><ItemArt item={nextHome}/></div>}
 {s.cue&&<span className={'mw-cue-art '+(s.cue==='portable'?'is-portable':'')} style={s.cue==='portable'?{left:position.x+'%',top:position.y+'%'}:{}} aria-hidden="true"><img src={art+'props/'+(s.cue==='portable'?'portable-cue':'threshold-cue')+'.svg'} alt=""/></span>}
 {s.phase!=='setup'&&<motion.img className="mw-mia" src={'/games/v2/characters/mia/'+(s.phase==='complete'?'relieved':s.focus==='request'?'thinking':carried.length?'carry':'neutral')+'.svg'} alt="" aria-hidden="true" initial={false} animate={{left:position.x+'%',top:position.y+'%'}} transition={reduced?{duration:0}:{type:'spring',bounce:0,duration:.32}}/>}
 </div>
 <div className="mw-workspace">
 {s.paused?<div className="mw-paused"><h2>The thought can wait.</h2><button className="mw-primary" onClick={()=>dispatch({type:'pause',value:false})}>Resume</button></div>:<>
 <p className="mw-message" role="status">{s.message}</p>
 {live&&<>
 {(plan||s.cue&&s.focus==='main')&&<div className="mw-plan" aria-label="Current intentions"><span>{s.powered?<Check size={16}/>:null}Charge laptop · Study</span><span>{s.parcelReady?<Check size={16}/>:null}Parcel + keys · Hall</span>{s.request==='mia'&&<span>Book · Living room</span>}</div>}
 {s.phase==='revisit'&&<button className="mw-reposition" onClick={()=>dispatch({type:'cue',value:s.cue==='portable'?'threshold':'portable'})}>{s.cue==='portable'?'Leave cue in hall':'Carry this cue'}</button>}
 <div className="mw-pocket" aria-label="Carried objects"><span>{carried.length}/2 hands</span>{carried.map(item=><button key={item} aria-label={`Put down ${labels[item]}`} onClick={()=>dispatch({type:'put',item})}><ItemArt item={item}/><span>Put down</span></button>)}</div>
 {s.request==='offered'?<div className="mw-request"><img src="/games/v2/characters/sam/thinking.svg" alt=""/><div><button onClick={()=>dispatch({type:'request',value:'mia'})}>I’ll bring it</button><button onClick={()=>dispatch({type:'request',value:'sam'})}>Ask Sam to collect</button></div></div>:<>
 <h2>{NAMES[s.room]}</h2><div className="mw-objects">{ITEMS.filter(item=>s.items[item]===s.room&&!(item==='charger'&&s.powered)&&!(item==='parcel'&&s.parcelReady)&&!(item==='book'&&(s.request==='done'||s.request==='sam'))).map(item=><button key={item} aria-label={`Pick up ${labels[item]}`} onClick={()=>dispatch({type:'take',item})}><ItemArt item={item}/><span>{labels[item]}</span></button>)}{!ITEMS.some(item=>s.items[item]===s.room)&&<span className="mw-empty">Nothing left here.</span>}</div>
 <div className="mw-room-actions">{s.room==='study'&&!s.powered&&<button className="mw-primary" onClick={()=>dispatch({type:'power'})}>Plug in laptop</button>}{s.room==='hall'&&!s.parcelReady&&<button className="mw-primary" onClick={()=>dispatch({type:'parcel'})}>Prepare parcel</button>}{s.room==='living'&&s.request==='mia'&&<button className="mw-primary" onClick={()=>dispatch({type:'book'})}>Leave book for Sam</button>}</div>
 </>}
 </>}
 {s.phase==='setup'&&<>
 {nextHome?<div className="mw-instruction"><ItemArt item={nextHome}/><h2>A home for the {labels[nextHome].toLowerCase()}.</h2><p>Choose a room.</p></div>:!s.cue?<><h2>Where should the clue live?</h2><div className="mw-choices"><button onClick={()=>dispatch({type:'cue',value:'portable'})}><img src={art+'props/portable-cue.svg'} alt=""/>Carry a note</button><button onClick={()=>dispatch({type:'cue',value:'threshold'})}><img src={art+'props/threshold-cue.svg'} alt=""/>Hallway cue</button></div></>:!s.owner?<><h2>Tomorrow’s book?</h2><div className="mw-choices"><button onClick={()=>dispatch({type:'owner',value:'mia'})}>Mia brings it</button><button onClick={()=>dispatch({type:'owner',value:'sam'})}>Sam collects it</button></div></>:<div className="mw-ready"><img src={art+'props/shared-board.svg'} alt=""/><button className="mw-primary" onClick={()=>dispatch({type:'tomorrow'})}>Try tomorrow</button></div>}
 </>}
 {s.phase==='complete'&&<div className="mw-ending"><img src={art+'props/shared-board.svg'} alt=""/><p>{s.firstMoves} → {s.moves} room changes</p><Link href="/lives/learn?module=external_cue_v1">Try a cue in my day</Link><button className="mw-primary" onClick={()=>dispatch({type:'restart'})}>Another morning</button></div>}
 </>}
 </div></div></section>
}
