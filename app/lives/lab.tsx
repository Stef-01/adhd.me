"use client";

// The lab (PRD §106–§107): the recommendation debugger — set the inputs, read the ranking with
// raw scores and why — and the director's rejection log for a seed, so nothing about what the
// engine chose is mysterious. Development tooling that ships, because a deterministic engine's
// best defence is being able to show its working.

import { useMemo, useState } from "react";
import { beginGame, CHARACTER_IDS, CHARACTERS, eligible, GAMES, MODULES, recommendStrategies, startSession, STRATEGIES, type CharacterId, type LearningDomain, type ResonanceSignal, type SessionState } from "@/lives";
import { LEARNING_DOMAINS } from "@/lives";
import { emptyProfile, writeProfile } from "@/lives";
import { deviceLearningStorage } from "@/learn/cursor";

export function LivesLab() {
  const [characters, setCharacters] = useState<CharacterId[]>(["arjun"]);
  const [games, setGames] = useState<string[]>(["arjun_lock_in"]);
  const [goals, setGoals] = useState<LearningDomain[]>([]);
  const [resonance, setResonance] = useState<Record<string, ResonanceSignal["response"] | "">>({});
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [seed, setSeed] = useState("lab");
  const [reset, setReset] = useState(false);
  const ranking = useMemo(() => recommendStrategies({
    encounteredGameIds: games, encounteredCharacterIds: characters,
    resonanceSignals: Object.entries(resonance).filter(([, r]) => r).map(([id, r]) => ({ sourceType: "character", sourceId: id, response: r as ResonanceSignal["response"], createdAt: 0 })),
    savedStrategyIds: [], completedModuleIds: [], recentlyCompletedModuleIds: [], dismissedStrategyIds: dismissed, selectedGoals: goals,
  }, STRATEGIES), [games, characters, resonance, dismissed, goals]);
  const run = useMemo(() => {
    let state: SessionState = startSession(`lab-${seed}`, 0);
    const rows: { index: number; game: string; rejected: number; rules: string[] }[] = [];
    for (let i = 0; i < 12; i++) {
      const { rejected } = eligible(state, GAMES);
      const begun = beginGame(state, GAMES);
      rows.push({ index: i, game: begun.game.id, rejected: rejected.length, rules: [...new Set(rejected.map((r) => r.rule))] });
      state = { ...begun.state, gameIndex: begun.state.gameIndex + 1, completedGames: begun.state.completedGames + 1, successes: begun.state.successes + 1, difficulty: Math.min(8, 1 + Math.floor((i + 1) / 4)) };
    }
    return rows;
  }, [seed]);
  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="me-screen learn-screen lives-screen lives-lab">
      <header className="life-head">
        <span className="life-eyebrow">ADHD Lives</span>
        <h1 className="life-title">The lab</h1>
        <p className="life-lede">Why the engine suggests what it suggests, and why the director picked what it picked. Nothing here is about a person.</p>
      </header>

      <section className="life-card" aria-labelledby="lab-inputs">
        <h2 id="lab-inputs">Recommendation inputs</h2>
        <fieldset className="lives-lab-set"><legend>Characters met</legend><div className="lives-chips">{CHARACTER_IDS.map((c) => <button key={c} type="button" className="lives-chip" aria-pressed={characters.includes(c)} onClick={() => toggle(characters, setCharacters, c)}>{c}</button>)}</div></fieldset>
        <fieldset className="lives-lab-set"><legend>Games met</legend><div className="lives-chips">{GAMES.map((g) => <button key={g.id} type="button" className="lives-chip" aria-pressed={games.includes(g.id)} onClick={() => toggle(games, setGames, g.id)}>{g.id}</button>)}</div></fieldset>
        <fieldset className="lives-lab-set"><legend>Goals</legend><div className="lives-chips">{LEARNING_DOMAINS.map((d) => <button key={d} type="button" className="lives-chip" aria-pressed={goals.includes(d)} onClick={() => toggle(goals, setGoals, d)}>{d}</button>)}</div></fieldset>
        <fieldset className="lives-lab-set"><legend>Resonance</legend>
          <div className="lives-lab-grid">
            {CHARACTERS.map((c) => (
              <label key={c.id} className="lives-lab-row"><span>{c.name}</span>
                <select value={resonance[c.id] ?? ""} onChange={(e) => setResonance((r) => ({ ...r, [c.id]: e.target.value as ResonanceSignal["response"] | "" }))}>
                  <option value="">, </option><option value="this_is_me">this is me</option><option value="sometimes">sometimes</option><option value="not_me">not me</option>
                </select>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="lives-lab-set"><legend>Dismissed</legend><div className="lives-chips">{STRATEGIES.map((s) => <button key={s.id} type="button" className="lives-chip" aria-pressed={dismissed.includes(s.id)} onClick={() => toggle(dismissed, setDismissed, s.id)}>{s.id}</button>)}</div></fieldset>
      </section>

      <section className="life-card" aria-labelledby="lab-ranking">
        <h2 id="lab-ranking">Ranking</h2>
        {ranking.length === 0 && <p>Nothing would be shown.</p>}
        <ol className="lives-lab-ranking">
          {ranking.map((r) => <li key={r.strategy.id}><strong>{r.strategy.title}</strong> <code>{r.strategy.id}</code> <span className="t-digit">{r.score}</span><ul>{r.reasons.map((why) => <li key={why}>{why}</li>)}</ul></li>)}
        </ol>
      </section>

      <section className="life-card" aria-labelledby="lab-director">
        <h2 id="lab-director">Director</h2>
        <label className="lives-lab-row"><span>Seed</span><input value={seed} maxLength={40} onChange={(e) => setSeed(e.target.value.replace(/[^a-z0-9_-]/gi, ""))} /></label>
        <div className="lives-lab-scroll" tabIndex={0} role="region" aria-label="Director run, as a table"><table className="lives-lab-table"><thead><tr><th scope="col">#</th><th scope="col">Game</th><th scope="col">Refused</th><th scope="col">Rules that fired</th></tr></thead>
          <tbody>{run.map((row) => <tr key={row.index}><td className="t-digit">{row.index + 1}</td><td><code>{row.game}</code></td><td className="t-digit">{row.rejected}</td><td>{row.rules.join("; ") || "—"}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="life-card" aria-labelledby="lab-modules">
        <h2 id="lab-modules">Modules</h2>
        <ul className="lives-lab-modules">{MODULES.map((m) => <li key={m.id}><details><summary>{m.title} <code>{m.id}</code> · {m.blocks.length} blocks · {m.estimatedMinutes} min</summary><pre>{JSON.stringify(m, null, 2)}</pre></details></li>)}</ul>
      </section>

      <section className="life-card" aria-labelledby="lab-reset">
        <h2 id="lab-reset">This device</h2>
        <button type="button" className="lives-choice is-small" onClick={() => { try { writeProfile(deviceLearningStorage, emptyProfile()); setReset(true); } catch { /* denied */ } }}>Reset the Lives profile on this device</button>
        {reset && <p role="status">Reset.</p>}
      </section>
    </div>
  );
}
