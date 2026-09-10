"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { actTheo, createTheoPlan, freshTheoState, THEO_ITEMS, type TheoItem } from "@/lives/theo-launch";
import { TheoHallway, TheoProp } from "./theo-art";
import type { EngineProps } from "./engines";

export function TheoGame({ scene, live, reducedMotion, progress, onResult, outcome }: EngineProps) {
  const plan = useMemo(() => createTheoPlan(scene.seed, scene.level), [scene.seed, scene.level]);
  const [state, setState] = useState(freshTheoState);
  const current = useRef(state); const liveRef = useRef(live); liveRef.current = live;
  const pad = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<TheoItem | null>(null);
  const dragged = useRef(false);
  useEffect(() => { if (!live) setDragging(null); }, [live]);
  const act = (item: TheoItem | "door") => {
    if (!liveRef.current || outcome) return;
    const next = actTheo(plan, current.current, item);
    if (next === current.current) return;
    current.current = next; setState(next);
    if (next.outcome !== "playing") onResult({ outcome: next.outcome, mistakes: next.detours.length, line: next.message });
  };
  const mood = outcome === "success" ? "success" : outcome === "failure" || outcome === "timeout" ? "failure" : state.detours.length > 0 || progress > .7 ? "worried" : "ready";
  return <div className="theo-game" data-live={live} data-reduced={reducedMotion} data-packed={state.packed.length}>
    <div className="theo-scene"><TheoHallway mood={mood} packed={state.packed.length} /></div>
    <div className="theo-packing">
      <div className="theo-packing-title"><strong>Pack for today</strong><span aria-label={`${state.detours.length} of 3 detours`}>{state.detours.length}/3 detours</span></div>
      <div className="theo-shelves" role="group" aria-label="Things in the hallway">
        {plan.objects.map((item, index) => {
          const packed = state.packed.includes(item), detour = state.detours.includes(item);
          return <motion.button key={item} type="button" className="theo-object" data-item={item} data-packed={packed} data-detour={detour} data-outcome={plan.essentials.includes(item) ? "hit" : "miss"}
            aria-label={`${packed ? "Packed" : detour ? "Leave for later" : "Pick up"} ${THEO_ITEMS[item].label}`} disabled={!live || packed || detour}
            drag={live && !packed && !detour} dragSnapToOrigin dragMomentum={false} dragElastic={.1}
            onPointerDown={() => { dragged.current = false; }}
            onDragStart={() => { dragged.current = true; setDragging(item); }}
            onDragEnd={(event) => {
              setDragging(null);
              if (event.type === "pointercancel" || event.type === "touchcancel") return;
              const box = pad.current?.getBoundingClientRect();
              if (box && "clientX" in event && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) act(item);
            }}
            onClick={() => { if (!dragged.current) act(item); dragged.current = false; }}
            initial={false} animate={{ opacity: packed || detour ? .5 : 1, rotate: packed || detour || reducedMotion ? 0 : index % 2 === 0 ? -3 : 3 }}
            whileDrag={{ scale: 1.06, zIndex: 10, rotate: 0 }} whileTap={reducedMotion ? undefined : { scale: .96 }}
            transition={{ type: "spring", duration: reducedMotion ? 0 : .25, bounce: 0 }}>
            <TheoProp item={item} /><span>{packed ? "Packed ✓" : detour ? "Later" : THEO_ITEMS[item].label}</span>
          </motion.button>;
        })}
      </div>
      <div ref={pad} className="theo-launch-pad" data-dragging={Boolean(dragging)} role="group" aria-label="Launch pad">
        <div><strong>Your launch pad</strong><span>{state.packed.length}/{plan.essentials.length} ready</span></div>
        <ul>{plan.essentials.map(item => <li key={item} data-ready={state.packed.includes(item)}><TheoProp item={item} /><span>{THEO_ITEMS[item].label}{state.packed.includes(item) ? " ✓" : ""}</span></li>)}</ul>
      </div>
      <button type="button" className="theo-door-button" disabled={!live} data-outcome={state.packed.length === plan.essentials.length ? "hit" : undefined} onClick={() => act("door")}>Open the door <span aria-hidden="true">↗</span></button>
    </div>
    <p className="theo-feedback" role="status">{state.message}</p>
  </div>;
}
