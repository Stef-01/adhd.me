"use client";
import { useRef, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { SceneArt } from "./scenes";
import type { EngineProps } from "./engines";

export function NinaDraft({ live, onResult, outcome }: Pick<EngineProps, "live" | "onResult" | "outcome">) {
  const [draft, setDraft] = useState("");
  const submitted = useRef(false);
  const ready = draft.trim().length > 0;
  return <div className="lives-world nina-draft-world" data-world="desk" data-live={live}>
    <SceneArt game="nina_first_line" stake={ready ? .6 : 0} outcome={outcome} />
    <form className="nina-paper" onSubmit={event => {
      event.preventDefault();
      if (!live || !ready || submitted.current) return;
      submitted.current = true; onResult({ outcome: "success", mistakes: 0 });
    }}>
      <label htmlFor="nina-first-line">First line</label>
      <textarea id="nina-first-line" value={draft} onChange={event => setDraft(event.target.value)} disabled={!live} maxLength={160} placeholder="It can be a rough start…" autoComplete="off" spellCheck={false} />
      <button className="journey-primary" type="submit" disabled={!live || !ready} data-outcome="hit"><Check size={20} /> Keep this draft</button>
    </form>
  </div>;
}
