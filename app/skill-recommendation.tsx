"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { rosterFor } from "@/demo/synthetic-roster";
import { readFilters, emptyFilters } from "@/finder/filters";
import { matchSkill } from "@/support/skill-match";
import { profession } from "@/support/professions";
import type { Subdomain } from "@/model/layers";
import { useModel } from "./use-model";
import { ClinicianPortrait } from "./finder-stages/shared";
import styles from "./skill-recommendation.module.css";

export function SkillRecommendation({ context }: { context?: Subdomain }) {
  const { record } = useModel();
  const [filters, setFilters] = useState(emptyFilters);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const read = () => { try { setFilters(readFilters(window.localStorage)); } catch { setFilters(emptyFilters()); } };
    read(); window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const match = record ? matchSkill(rosterFor(true), filters, record, context) : null;
  if (!match) return null;
  const { provider, label } = match;
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  return <div className={styles.wrap} data-skill-match={match.skill}>
    <motion.button ref={trigger} type="button" className={styles.card}
      initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: .3 }}
      onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`${provider.name}: ${label}`}>
      <span className={styles.face}><ClinicianPortrait clinician={provider} variant="thumb" /></span>
      <span className={styles.copy}><span className={styles.name}>{provider.name}</span><strong>{label}</strong></span>
      <ArrowUpRight size={19} aria-hidden="true" />
    </motion.button>
    <dialog ref={dialog} className={styles.sheet} aria-labelledby={`skill-name-${provider.id}`} onCancel={event => { event.preventDefault(); close(); }}>
      <div className={styles.inside}>
        <button type="button" className={styles.close} onClick={close} aria-label="Close recommendation"><X size={20} /></button>
        <span className={styles.portrait}><ClinicianPortrait clinician={provider} variant="thumb" eager /></span>
        <p className={styles.eyebrow}>{match.basis === "your-answers" ? "For what you shared" : "Help with this practice"}</p>
        <h2 id={`skill-name-${provider.id}`}>{provider.name}</h2>
        <p>{profession(provider.profession ?? "gp").label}</p>
        <strong className={styles.skill}>{label}</strong>
        <Link href={`/practitioner/${encodeURIComponent(provider.id)}`} className={styles.profile}>View full profile <ArrowUpRight size={18} /></Link>
      </div>
    </dialog>
  </div>;
}
