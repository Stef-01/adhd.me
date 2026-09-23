"use client";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Pause, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";
import { sound, type ScoreSpec } from "../sounds";

/** Subscribe to the shared mute preference. */
export function useMuted() { return useSyncExternalStore(fn => sound().subscribe(fn), () => sound().muted, () => true); }

/** Leo's calm frame for every live world: toolbar, caption, HUD, stage, status and a pause sheet. */
export function GameShell({ name, label, eyebrow, heading, objective, hud, status, paused, still, onPause, onResume, onStill, phaseKey, data, style, score, playing = false, intensity = .3, children }: {
  name: string; label: string; eyebrow: string; heading: string; objective?: string; hud?: ReactNode; status?: ReactNode;
  paused: boolean; still: boolean; onPause: () => void; onResume: () => void; onStill: (value: boolean) => void;
  phaseKey: string; data?: Record<string, string | number | boolean | undefined>; style?: CSSProperties; children: ReactNode;
  score?: ScoreSpec; playing?: boolean; intensity?: number;
}) {
  const muted = useMuted();
  useEffect(() => {
    if (!score || muted || paused || !playing) { sound().stopScore(); return; }
    sound().score(score);
  }, [score, muted, paused, playing]);
  useEffect(() => { sound().intensity(intensity); }, [intensity]);
  useEffect(() => { if (paused) sound().pause(); else sound().resume(); }, [paused]);
  useEffect(() => () => sound().stopScore(), []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "m" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) sound().toggle(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (paused) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else if (dialog.current?.open) { dialog.current.close(); pauseButton.current?.focus({ preventScroll: true }); }
  }, [paused]);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [phaseKey]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !paused) { event.preventDefault(); onPause(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [paused, onPause]);
  const attributes = Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [`data-${key}`, value === undefined ? undefined : String(value)]));
  return <section className={`kit-game lives-run ${name}`} aria-label={label} data-paused={paused} data-still={still} style={style} {...attributes} onPointerUp={() => sound().unlock()} onKeyUp={() => sound().unlock()}>
    <header className="kit-toolbar">
      <Link href="/approach?pane=games" aria-label="Back to games" className="kit-icon"><ArrowLeft size={21} /></Link>
      <span>{eyebrow}</span>
      <div><button className="kit-icon" onClick={() => sound().toggle()} aria-pressed={!muted} aria-label={muted ? "Sound off" : "Sound on"}>{muted ? <SpeakerSlash size={21} /> : <SpeakerHigh size={21} />}</button><button className="kit-icon" ref={pauseButton} onClick={onPause} aria-label="Pause game"><Pause size={21} /></button></div>
    </header>
    <div className="kit-caption">
      <h1 tabIndex={-1} ref={title}>{heading}</h1>
      {objective && <p>{objective}</p>}
      {hud && <div className="kit-hud">{hud}</div>}
    </div>
    <div className="kit-stage">{children}</div>
    <p className="kit-status" role="status">{status}</p>
    <dialog className="kit-pause" aria-labelledby={`${name}-pause`} ref={dialog} onCancel={event => { event.preventDefault(); onResume(); }}>
      <button className="kit-icon kit-pause-close" aria-label="Close pause menu" onClick={onResume}><X size={20} /></button>
      <h2 id={`${name}-pause`}>Nothing to keep up with.</h2>
      <button className="kit-primary" autoFocus onClick={onResume}>Resume <ArrowRight size={19} /></button>
      <button className="kit-pace" aria-pressed={still} onClick={() => onStill(!still)}><span>Play at my pace</span><span className="kit-switch" aria-hidden="true" data-on={still}><span /></span></button>
    </dialog>
  </section>;
}

/** A HUD reading that is never colour alone. */
export function Meter({ label, value, text }: { label: string; value: number; text: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return <div className="kit-meter"><span>{label}</span><div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={text}><span style={{ transform: `scaleX(${pct / 100})` }} /></div></div>;
}
