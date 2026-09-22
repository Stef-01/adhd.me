"use client";
import Link from 'next/link';
import { useEffect,useReducer,useRef,useState } from 'react';
import { motion,useReducedMotion } from 'motion/react';
import { ArrowLeft,Pause,Play } from '@phosphor-icons/react';
import { createZoe,zoeReducer,SCENARIOS,TIMES,type Fact,type Need,type Plan } from '@/lives/zoe-world';
const art='/games/next-three/zoe/';
const factLabels:Record<Fact,string>={changed:'What happened',uncertain:'I’m not sure',assumed:'You don’t care'};
const needLabels:Record<Need,string>={company:'Time together',notice:'More notice',space:'Some space'};
const planLabels:Record<Plan,string>={together:'Meet',call:'Call',separate:'Separate plans'};
function Art({name}:{name:string}){return <img src={art+'props/'+name+'.svg'} alt="" draggable={false}/>}
export function ZoeWorldGame(){
 const [s,dispatch]=useReducer(zoeReducer,undefined,()=>createZoe());const [tab,setTab]=useState<'fact'|'need'|'plan'>('fact');const [inspect,setInspect]=useState(false);const reduced=useReducedMotion();const heading=useRef<HTMLHeadingElement>(null);const previous=useRef(s.phase);const scenario=SCENARIOS[s.scenario]!;
 useEffect(()=>{if(previous.current!==s.phase){heading.current?.focus({preventScroll:true});previous.current=s.phase}},[s.phase]);
 useEffect(()=>{const hide=()=>{if(document.hidden)dispatch({type:'pause',value:true})};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 const active=s.phase==='conversation';const title=active?scenario.title:s.phase==='setup'?'Give the plan a place.':s.phase==='revisit'?'A plan can change.':'Still on the same side.';
 const castPose=s.sharp&&!s.repaired?'frustrated':s.phase==='complete'?'relieved':'thinking';
 return <section className="zw-game lives-run" data-phase={s.phase} data-scenario={s.scenario} data-paused={s.paused} aria-labelledby="zw-title">
 <nav className="zw-nav" aria-label="Game navigation"><Link aria-label="Back to games" href="/approach?pane=games"><ArrowLeft size={22}/></Link><span>Zoe · Before you send</span><button aria-label={s.paused?'Resume game':'Pause game'} onClick={()=>dispatch({type:'pause',value:!s.paused})}>{s.paused?<Play size={20}/>:<Pause size={20}/>}</button></nav>
 <header className="zw-heading"><h1 id="zw-title" ref={heading} tabIndex={-1}>{title}</h1><span className="zw-phase">{active?'A changed plan':s.phase==='setup'?'Make it easier':s.phase==='revisit'?'Later that evening':'Your next step'}</span></header>
 <div className="zw-layout">
 <div className="zw-scene" aria-hidden="true"><img className="zw-layer" src={art+'scenes/desktop/background.svg'} alt=""/><img className="zw-layer" src={art+'scenes/desktop/furniture.svg'} alt=""/>
 <motion.img className="zw-person zw-zoe" src={'/games/v2/characters/zoe/'+castPose+'.svg'} alt="" animate={{y:0}} initial={reduced?false:{y:6}} transition={{duration:.22}}/>
 <img className="zw-person zw-rae" src={'/games/v2/characters/rae/'+(s.sharp&&!s.repaired?'sad':s.phase==='complete'?'relieved':'thinking')+'.svg'} alt=""/>
 {s.saved&&<span className="zw-saved-art"><Art name="draft-envelope"/></span>}
 {s.agreement&&<span className="zw-agreement-art"><Art name={s.agreement.cue?'calendar-agreed':'calendar-open'}/></span>}
 </div>
 <div className="zw-workspace">
 {s.paused?<div className="zw-paused"><h2>The reply can wait.</h2><button className="zw-primary" onClick={()=>dispatch({type:'pause',value:false})}>Resume</button></div>:<>
 <motion.div className="zw-message" key={s.message} initial={reduced?false:{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:.16}}><p role="status">{s.message}</p></motion.div>
 {active&&<>
 <div className="zw-tools"><button onClick={()=>dispatch({type:'ask'})} disabled={s.known}>Ask what happened</button><button aria-expanded={inspect} onClick={()=>setInspect(!inspect)}>Calendar</button><button aria-pressed={s.saved} onClick={()=>dispatch({type:s.saved?'restore':'save'})}>{s.saved?'Restore draft':'Keep draft'}</button></div>
 {inspect?<div className="zw-calendar"><h2>Room for both.</h2><p>Zoe: 6–8 pm.</p><p>Rae: {s.known?scenario.available.map(t=>`${t-12} pm${t===20?' · brief':''}`).join(', '):'Not confirmed.'}</p><button onClick={()=>setInspect(false)}>Back to reply</button></div>:<>
 <div className="zw-draft" aria-label="Your reply"><button aria-label="Edit fact" onClick={()=>setTab('fact')} data-selected={tab==='fact'}><Art name={s.draft.fact==='assumed'?'unknown-fragment':'fact-fragment'}/><span>{s.draft.fact?factLabels[s.draft.fact]:'Fact'}</span></button><button aria-label="Edit need" onClick={()=>setTab('need')} data-selected={tab==='need'}><Art name="need-fragment"/><span>{s.draft.need?needLabels[s.draft.need]:'Need'}</span></button><button aria-label="Edit request" onClick={()=>setTab('plan')} data-selected={tab==='plan'}><Art name="request-fragment"/><span>{s.draft.plan?planLabels[s.draft.plan]:'Request'}</span></button></div>
 <div className="zw-pieces" role="group" aria-label={tab==='fact'?'Choose a fact':tab==='need'?'Choose a need':'Choose a request'}>
 {tab==='fact'&&(Object.keys(factLabels) as Fact[]).map(value=><button key={value} disabled={value==='changed'&&!s.known} aria-pressed={s.draft.fact===value} onClick={()=>{dispatch({type:'fact',value});setTab('need')}}>{value==='changed'&&s.known?scenario.fact:factLabels[value]}</button>)}
 {tab==='need'&&(Object.keys(needLabels) as Need[]).map(value=><button key={value} aria-pressed={s.draft.need===value} onClick={()=>{dispatch({type:'need',value});setTab('plan')}}>{needLabels[value]}</button>)}
 {tab==='plan'&&(Object.keys(planLabels) as Plan[]).map(value=><button key={value} aria-pressed={s.draft.plan===value} onClick={()=>dispatch({type:'plan',value})}>{planLabels[value]}</button>)}
 </div>
 {tab==='plan'&&<div className="zw-times" role="group" aria-label="Propose a time">{TIMES.map(value=><button key={value} aria-pressed={s.draft.time===value} onClick={()=>dispatch({type:'time',value})}>{value-12} pm</button>)}</div>}
 <div className="zw-actions">{s.sharp&&!s.repaired?<button onClick={()=>dispatch({type:'repair'})}>Own the sharp reply</button>:<button onClick={()=>dispatch({type:'sharp'})}>Send “Whatever.”</button>}<button className="zw-primary" disabled={!s.draft.fact||!s.draft.need||!s.draft.plan} onClick={()=>dispatch({type:'send'})}>Propose</button></div>
 </>}
 </>}
 {s.phase==='setup'&&<div className="zw-setup">
 <div className="zw-plan"><Art name={s.agreement?.cue?'calendar-agreed':'calendar-open'}/><span>{planLabels[s.agreement!.plan]} · {s.agreement!.time-12} pm</span></div>
 {s.setup==='owner'?<><h2>Who checks in?</h2><div className="zw-choices">{(['zoe','rae'] as const).map(value=><button key={value} onClick={()=>dispatch({type:'owner',value})}><img src={'/games/v2/characters/'+value+'/neutral.svg'} alt=""/>{value==='zoe'?'Zoe':'Rae'}</button>)}</div></>:s.setup==='cue'?<><h2>Where will it live?</h2><div className="zw-choices"><button onClick={()=>dispatch({type:'cue',value:'calendar'})}><Art name="calendar-open"/>Calendar</button><button onClick={()=>dispatch({type:'cue',value:'phone'})}><Art name="return-cue"/>Phone reminder</button></div></>:<><p>{s.agreement!.owner==='zoe'?'Zoe':'Rae'} checks in. {s.agreement!.cue==='calendar'?'Calendar holds it.':'Reminder is set.'}</p><button className="zw-primary" onClick={()=>dispatch({type:'tomorrow'})}>Later that evening</button></>}
 </div>}
 {(s.phase==='revisit'||s.phase==='complete')&&<div className="zw-setup"><div className="zw-plan"><Art name={s.outcome==='boundary'?'boundary-ribbon':'calendar-agreed'}/><span>{planLabels[s.agreement!.plan]} · {s.agreement!.time-12} pm</span></div><p>{s.agreement!.owner==='zoe'?'Zoe':'Rae'} checks in · {s.agreement!.cue==='calendar'?'Calendar':'Phone reminder'}</p>
 {s.phase==='revisit'?<div className="zw-choices"><button onClick={()=>dispatch({type:'adjust'})}>Move it to 8 pm</button><button onClick={()=>dispatch({type:'boundary'})}>Keep separate plans</button></div>:<div className="zw-ending"><Link href="/lives/learn?module=pause_before_send_v1">Try this in my day</Link><button className="zw-primary" onClick={()=>{dispatch({type:'restart'});setTab('fact');setInspect(false)}}>Another situation</button></div>}
 </div>}
 </>}
 </div></div>
 </section>
}
