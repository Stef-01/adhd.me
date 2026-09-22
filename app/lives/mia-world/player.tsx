"use client";
import Link from 'next/link';
import { useEffect, useReducer, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Pause, Play, ArrowRight, PushPin, PaperPlaneTilt } from '@phosphor-icons/react';
import { createMia, miaReducer, INTENTIONS, THOUGHTS, ports } from '@/lives/mia-world';
const ART = '/games/next-three/mia/';
export function MiaWorldGame() {
  const [s, dispatch] = useReducer(miaReducer, undefined, () => createMia());
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(s.phase);
  useEffect(() => {
    if (previous.current !== s.phase) { heading.current?.focus({ preventScroll: true }); previous.current = s.phase; }
  }, [s.phase]);
  useEffect(() => {
    const hide = () => { if (document.hidden) dispatch({ type: 'pause', value: true }); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const setup = s.phase === 'setup';
  const complete = s.phase === 'complete';
  const title = setup ? 'Give it a way back.' : complete ? 'A thought, carried through.' : 'Keep the thread.';
  const intention = s.phase === 'revisit' || complete ? 'Send Sam the revised draft.' : INTENTIONS[s.round];
  return <section className="mt-game lives-run" data-phase={s.phase} data-round={s.round} data-paused={s.paused} aria-labelledby="mt-title">
    <nav className="mt-nav" aria-label="Game navigation">
      <Link href="/approach?pane=games" aria-label="Back to games"><ArrowLeft size={22}/></Link>
      <span>Mia · Remember why</span>
      <button aria-label={s.paused ? 'Resume game' : 'Pause game'} onClick={() => dispatch({ type: 'pause', value: !s.paused })}>{s.paused ? <Play size={20}/> : <Pause size={20}/>}</button>
    </nav>
    <header className="mt-heading">
      <div className="mt-progress" role="img" aria-label={`Thread ${s.round + 1} of 3`}>{[0, 1, 2].map(n => <i key={n} className={n <= s.round ? 'is-lit' : ''}/>)}</div>
      <h1 ref={heading} tabIndex={-1} id="mt-title">{title}</h1>
      <p className={'mt-intention ' + (s.cue ? 'has-cue' : '')}>{s.cue && <PushPin size={16}/>}<span>{intention}</span></p>
    </header>
    {s.paused ? <div className="mt-pause"><h2>A moment to pause.</h2><button className="mt-primary" onClick={() => dispatch({ type: 'pause', value: false })}>Resume</button></div> : <>
      <span id="mt-board-help" className="sr-only mt-sr-only">Four rows of four connections. Start at connection 5 from the left. Reach connection 8 and exit right. Each press turns a connection clockwise.</span>
      <div className="mt-scene">
        <div className="mt-source" aria-hidden="true"><img src={'/games/v2/characters/mia/' + (complete || s.solved ? 'relieved' : s.distracted !== null ? 'thinking' : 'neutral') + '.svg'} alt=""/><span/></div>
        <div className="mt-board" role="group" aria-label="Thought connections" aria-describedby="mt-board-help">
          {s.tiles.map((tile, index) => {
            const visited = s.trace.includes(index);
            const anchored = s.anchor === index;
            const direction = ports(tile).map(n => ['up', 'right', 'down', 'left'][n]).join(' and ');
            return <button key={index} className={'mt-tile ' + (visited ? 'is-flowing ' : '') + (anchored ? 'is-anchored ' : '') + (s.shifted === index ? 'is-nudged' : '')}
              data-index={index} data-turn={tile.turn} data-kind={tile.kind} data-ports={ports(tile).join(',')}
              style={{ '--flow-delay': `${Math.max(0, s.trace.indexOf(index)) * 80}ms` } as React.CSSProperties}
              aria-label={setup ? `Anchor connection ${index + 1}` : `Turn connection ${index + 1}, ${direction}`}
              disabled={complete || (!setup && s.solved) || (setup && !visited) || (s.phase === 'revisit' && anchored)}
              aria-pressed={setup ? anchored : undefined}
              onClick={() => dispatch({ type: setup ? 'anchor' : 'rotate', index })}>
              <motion.svg viewBox="0 0 100 100" aria-hidden="true" initial={false} animate={{ rotate: tile.turn * 90 }} transition={reduced ? { duration: 0 } : { type: 'spring', bounce: 0, duration: .22 }}>
                <path className="mt-channel" d={tile.kind === 'bend' ? 'M50 0V28Q50 50 72 50H100' : 'M50 0V100'}/>
                <path className="mt-current" d={tile.kind === 'bend' ? 'M50 0V28Q50 50 72 50H100' : 'M50 0V100'}/>
              </motion.svg>
              {anchored && <span className="mt-pin"><PushPin size={14} weight="fill"/></span>}
            </button>;
          })}
        </div>
        <div className={'mt-target ' + (s.solved ? 'is-delivered' : '')} aria-hidden="true"><PaperPlaneTilt size={24} weight="fill"/></div>
      </div>
      <div className="mt-controls">
        <p className="mt-status" role="status">{s.message}</p>
        {setup ? <>
          {!s.cue ? <div className="mt-cues">
            <button onClick={() => dispatch({ type: 'cue', cue: 'note' })}><img src={ART + 'props/portable-cue.svg'} alt=""/>Write it down</button>
            <button onClick={() => dispatch({ type: 'cue', cue: 'say' })}><img src={ART + 'props/intention-thread.svg'} alt=""/>Say it aloud</button>
          </div> : s.anchor === null ? <p className="mt-hint">Choose a glowing connection.</p> : <button className="mt-primary" onClick={() => dispatch({ type: 'revisit' })}>Try with my cue <ArrowRight/></button>}
        </> : complete ? <><div className="mt-ending"><Link className="mt-primary" href="/lives/learn?module=external_cue_v1">Try a cue in my day <ArrowRight/></Link><button className="mt-secondary" onClick={() => dispatch({ type: 'restart' })}>Another thread</button></div>{s.parked.length > 0 && <div className="mt-saved"><span>Saved for later</span><ul>{s.parked.map(id => <li key={id}>{THOUGHTS[id] ?? 'Tomorrow’s plans'}</li>)}</ul></div>}</> : <>
          {s.distracted !== null && <div className="mt-distraction"><span>{THOUGHTS[s.distracted] ?? 'Tomorrow’s plans'}</span><button onClick={() => dispatch({ type: 'park' })}>Park for later <ArrowRight size={16}/></button></div>}
          <button className="mt-primary" onClick={() => dispatch({ type: s.solved ? 'next' : 'pulse' })}>{s.solved ? (s.round === 2 ? 'Give it a cue' : 'Next thread') : 'Send thought'}{s.solved ? <ArrowRight/> : <Play weight="fill"/>}</button>
          {s.parked.length > 0 && <span className="mt-pocket" aria-label={`${s.parked.length} thoughts saved for later`}>{s.parked.length} saved for later</span>}
        </>}
      </div>
    </>}
  </section>;
}
