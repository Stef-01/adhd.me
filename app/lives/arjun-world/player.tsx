"use client";
import Link from 'next/link';
import { useEffect, useReducer, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pause, Play, PushPin, X, Tray, Check } from '@phosphor-icons/react';
import { createArjun, arjunReducer, SCENARIOS, label, optionTime, type Evidence } from '@/lives/arjun-world';
const ART='/games/next-three/arjun/';
const ALL:Evidence[]=['access','size','time','idea'];
export function ArjunWorldGame(){
  const [s,dispatch]=useReducer(arjunReducer,undefined,()=>createArjun());
  const [tab,setTab]=useState<'people'|'options'>('people');
  const reduced=useReducedMotion(); const heading=useRef<HTMLHeadingElement>(null); const previous=useRef(s.phase);
  useEffect(()=>{if(previous.current!==s.phase){heading.current?.focus({preventScroll:true});previous.current=s.phase;setTab('people')}},[s.phase]);
  useEffect(()=>{const hide=()=>{if(document.hidden)dispatch({type:'pause',value:true})};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
  const c=SCENARIOS[s.scenario]!;const active=s.phase==='meeting'||s.phase==='revisit'; const complete=s.phase==='complete';
  const selected=c.options.find(o=>o.id===s.selected);
  const title=complete?'A plan with room for everyone.':s.phase==='setup'?'Leave a shared next step.':s.phase==='revisit'?'The plan has changed.':c.question;
  return <section className="aw-game lives-run" data-phase={s.phase} data-scenario={s.scenario} data-paused={s.paused} aria-labelledby="aw-title">
    <nav className="aw-nav" aria-label="Game navigation"><Link href="/approach?pane=games" aria-label="Back to games"><ArrowLeft size={22}/></Link><span>Arjun · Hold the thread</span><button aria-label={s.paused?'Resume game':'Pause game'} onClick={()=>dispatch({type:'pause',value:!s.paused})}>{s.paused?<Play size={20}/>:<Pause size={20}/>}</button></nav>
    <header className="aw-heading"><h1 id="aw-title" ref={heading} tabIndex={-1}>{title}</h1>{s.anchor&&<span className="aw-anchor"><PushPin size={17}/>{c.question}</span>}</header>
    {s.paused?<div className="aw-paused"><h2>The meeting can wait.</h2><button className="aw-primary" onClick={()=>dispatch({type:'pause',value:false})}>Resume</button></div>:<div className="aw-layout">
      <div className="aw-workspace">
        <div className="aw-cast" aria-hidden="true"><img src="/games/v2/characters/noor/neutral.svg" alt=""/><img className="aw-arjun" src={complete?'/games/v2/characters/arjun/relieved.svg':ART+'characters/'+(s.phase==='setup'?'pin-anchor':s.phase==='revisit'?'retrieve-idea':'offer-turn')+'.svg'} alt=""/><img src="/games/v2/characters/rae/neutral.svg" alt=""/></div>
        <div className="aw-table">
          <div className="aw-board" role="group" aria-label="Three working spaces">
            {[0,1,2].map(slot=>{const id=s.board[slot];return id?<motion.article key={id} className={'aw-card '+(id==='idea'?'is-idea':'')} data-evidence={id} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.18}}>
              <img src={ART+'props/'+(id==='idea'?'idea-tile':'fact-tile')+'.svg'} alt=""/><span>{label(s,id)}</span>
              {active&&<div className="aw-card-actions"><button aria-label={`Return ${label(s,id)} to notes`} onClick={()=>dispatch({type:'remove',id})}><X size={16}/></button>{id==='idea'&&<button aria-label="Park idea" onClick={()=>dispatch({type:'park',id})}><Tray size={18}/></button>}</div>}
            </motion.article>:<div className="aw-space" role="img" key={'empty'+slot} aria-label="Empty working space"><PushPin size={20}/></div>})}
          </div>
          <img className="aw-bridge" src={ART+'props/decision-bridge.svg'} alt=""/>
          <div className={'aw-decision '+(selected?'has-option':'')}><img src={ART+'props/action-card.svg'} alt=""/><span>{selected?.name??'Your proposal'}</span>{(s.phase==='setup'||complete)&&<Check size={20}/>}</div>
        </div>
        {active&&<div className="aw-notes" role="group" aria-label="Available notes">{ALL.filter(id=>s.known.includes(id)&&!s.board.includes(id)&&!s.parked.includes(id)).map(id=><button key={id} onClick={()=>dispatch({type:'pin',id})} aria-label={`Pin ${label(s,id)}`}><PushPin size={15}/>{label(s,id)}</button>)}{s.parked.map(id=><button className="aw-parked" key={id} onClick={()=>dispatch({type:'retrieve',id})} aria-label={`Retrieve ${label(s,id)}`}><Tray size={17}/>{label(s,id)}</button>)}</div>}
      </div>
      <div className="aw-panel">
        <p role="status" className="aw-status">{s.message}</p>
        {active?<>
          <div className="aw-tabs" role="group" aria-label="Meeting information"><button aria-pressed={tab==='people'} onClick={()=>setTab('people')}>People</button><button aria-pressed={tab==='options'} onClick={()=>setTab('options')}>Options</button></div>
          {tab==='people'?<div className="aw-people">{(['noor','rae'] as const).map(person=><button key={person} onClick={()=>dispatch({type:'ask',person})}><img src={'/games/v2/characters/'+person+'/thinking.svg'} alt=""/><span>Ask {person==='noor'?'Noor':'Rae'}</span><ArrowRight size={18}/></button>)}</div>:<div className="aw-options" role="group" aria-label="Possible plans">{c.options.map(option=><button key={option.id} aria-pressed={s.selected===option.id} onClick={()=>dispatch({type:'select',id:option.id})} aria-label={`Choose ${option.name}`}><strong>{option.name}</strong><span>{option.size} places · {option.access?c.access:'No '+c.access.toLowerCase()} · {optionTime(s,option)}</span>{s.phase==='revisit'&&<small>{option.feature?c.feature:'No '+c.feature.toLowerCase()}</small>}</button>)}</div>}
          <button className="aw-primary" onClick={()=>dispatch({type:'propose'})}>Connect the plan <ArrowRight size={20}/></button>
        </>:s.phase==='setup'?<div className="aw-setup">
          {!s.anchor?<button className="aw-practice" onClick={()=>dispatch({type:'anchor'})}><img src={ART+'props/agenda-anchor.svg'} alt=""/>Pin the question</button>:!s.parked.includes('idea')?<button className="aw-practice" onClick={()=>dispatch({type:'park',id:'idea'})}><img src={ART+'props/parking-pocket.svg'} alt=""/>Keep the idea for later</button>:!s.owner?<><h2>Who follows up?</h2><div className="aw-owner">{(['noor','rae'] as const).map(person=><button key={person} onClick={()=>dispatch({type:'owner',person})}><img src={'/games/v2/characters/'+person+'/neutral.svg'} alt=""/>{person==='noor'?'Noor':'Rae'}</button>)}</div></>:!s.when?<><h2>Agree a time.</h2><div className="aw-times"><button onClick={()=>dispatch({type:'when',when:'today'})}>Today</button><button onClick={()=>dispatch({type:'when',when:'tomorrow'})}>Tomorrow</button></div><button className="aw-quiet" onClick={()=>dispatch({type:'change-owner'})}>Change owner</button></>:<><div className="aw-agreement"><img src={ART+'props/action-card.svg'} alt=""/><span>Confirm {selected?.name}<br/>{s.owner==='noor'?'Noor':'Rae'} · {s.when}</span></div><button className="aw-primary" onClick={()=>dispatch({type:'continue'})}>Next meeting <ArrowRight size={20}/></button></>}
        </div>:<div className="aw-ending"><div className="aw-agreement"><img src={ART+'props/action-card.svg'} alt=""/><span>Confirm {selected?.name}<br/>{s.agreement?.owner==='noor'?'Noor':'Rae'} · {s.agreement?.when}</span></div><Link className="aw-primary" href="/lives/learn?module=meeting_anchor_v1">Try a meeting anchor <ArrowRight size={20}/></Link><button className="aw-quiet" onClick={()=>dispatch({type:'restart'})}>Another meeting</button></div>}
      </div>
    </div>}
  </section>;
}
