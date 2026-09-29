"use client";
import { Check } from "@phosphor-icons/react";
export function SettleChoices<T extends string>({ value, onChoose, choices }: { value: T | null; onChoose: (choice:T)=>void; choices: readonly { id:T; label:string; art:string }[] }) {
  return <div className="kit-settle" role="group" aria-label="Try something for the next round">{choices.map(choice => <button key={choice.id} aria-pressed={value === choice.id} onClick={() => onChoose(choice.id)}><img src={`/games/settle/${choice.art}${value === choice.id ? "-ready" : ""}.svg`} alt="" width="64" height="48" /><span>{choice.label}</span>{value === choice.id && <Check size={16} weight="bold" />}</button>)}</div>;
}
