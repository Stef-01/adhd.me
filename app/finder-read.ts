"use client";

// How the finder reads a request (docs/matching/LLM-MATCHING-PLAN.md §15, §16f): the person's AI or
// Standard choice, the model's read at level 1, and the voice finder's read-ahead. The finder keeps
// its stages and ranking; this is the part that decides whose reading the ranking runs on.

import { useCallback, useEffect, useMemo, useState } from "react";
import { needsFor, type Clinician } from "@/demo/clinicians";
import { worthReading } from "@/finder/read-policy";
import { facetKey, needForKey } from "@/matching/needs";
import { MODE_KEY, type FinderMode } from "./finder-stages/welcome-stage";

/** At level 1, how long the results wait for the read before ranking on the finder's own. */
const READ_TIMEOUT_MS = 12_000;

/**
 * AI or Standard (founder, 2026-09-29: "toggle between LLM matching or standard"), a choice this
 * device keeps: AI reads with the model and talks with the voice finder; Standard is the word
 * matcher alone, with dictation. Offered only where this server can do either.
 *
 * @param readLevel `ADHDME_LLM_LEVEL` in effect. @param voice `ADHDME_VOICE` in effect.
 */
export function useFinderMode(readLevel: number, voice: boolean) {
  const [mode, setMode] = useState<FinderMode>("ai");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "standard") setMode("standard");
    } catch {}
  }, []);
  const chooseMode = useCallback((next: FinderMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {}
  }, []);
  return {
    /** The chosen mode, or null where this server offers only Standard. */
    mode: readLevel >= 1 || voice ? mode : null,
    chooseMode,
    /** The read level for this person: the server's with AI, 0 with Standard. */
    level: mode === "ai" ? readLevel : 0,
    /** Whether the microphone opens the voice finder rather than dictation. */
    talks: mode === "ai" && voice,
  };
}

/**
 * Level 1: the results ask `/api/finder/read` once for each new set of words and wait for it, only
 * where it helps (src/finder/read-policy.ts: a short request the lexicon already heard lists at
 * once). Its keys are the read everything runs on; with no answer, or the lexicon's, it is the
 * finder's own read, exactly the level 0 list.
 *
 * @param active The results are on screen, so a read is wanted now.
 */
export function useModelRead(level: number, request: string, roster: readonly Clinician[], active: boolean) {
  const [routeRead, setRouteRead] = useState<{ request: string; done: boolean; keys?: string[]; unlisted: string[] }>({ request: "", done: true, unlisted: [] });
  /** The finder's own reading of these words: the fallback, and the words each key was heard in. */
  const heard = useMemo(() => needsFor(request, roster), [request, roster]);
  const modelReads = useMemo(() => level >= 1 && worthReading(request, heard.length), [level, request, heard]);
  /** Asks the route to read these words; the answer lands only while they are still the ones read. */
  const readWords = useCallback((words: string) => {
    setRouteRead({ request: words, done: false, unlisted: [] });
    const body = JSON.stringify({ text: words });
    fetch("/api/finder/read", { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(READ_TIMEOUT_MS) })
      .then((reply) => (reply.ok ? (reply.json() as Promise<{ keys: string[]; source: string; unlisted?: string[] }>) : null))
      .catch(() => null)
      .then((answer) => setRouteRead((held) => held.request !== words ? held : {
        request: words,
        done: true,
        keys: answer?.source === "llm" ? answer.keys : undefined,
        unlisted: answer?.source === "llm" && Array.isArray(answer.unlisted) ? answer.unlisted.filter((p): p is string => typeof p === "string") : [],
      }));
  }, []);
  useEffect(() => {
    if (!modelReads || !active || routeRead.request === request) return;
    readWords(request);
  }, [modelReads, active, request, routeRead.request, readWords]);
  /**
   * The voice finder's sentence is read the moment the model writes it, while its last words are
   * still being said, so the matches arrive with the read done rather than behind "Reading what you
   * asked". The same trim `findMatches` applies, so the results find it as theirs.
   */
  const readAhead = useCallback((words: string) => {
    const trimmed = words.trim();
    if (level >= 1 && trimmed && worthReading(trimmed, needsFor(trimmed, roster).length)) readWords(trimmed);
  }, [level, readWords, roster]);
  const landed = level >= 1 && routeRead.request === request;
  /**
   * The model's needs for these words, or undefined where the finder's own read stands. A need's
   * quote is the words the lexicon heard the same key in, and nothing where it heard none: the model
   * returns keys, not the person's words, and a key is never shown as one (qa/matching/rca.md, R15).
   */
  const modelNeeds = useMemo(() => {
    if (!landed || !routeRead.keys) return undefined;
    const spoken = new Map(heard.map((need) => [facetKey(need.facet), need.matched]));
    return routeRead.keys.flatMap((key) => needForKey(key, spoken.get(key) ?? "") ?? []);
  }, [landed, routeRead.keys, heard]);
  return {
    /** A read is wanted for these words and has not landed. */
    reading: modelReads && (routeRead.request !== request || !routeRead.done),
    modelNeeds,
    /** The finder's own reading, which stands wherever the model's does not. */
    heard,
    /** Asks the model heard that no key covers, kept with the search's record. */
    unlisted: landed ? routeRead.unlisted : [],
    readAhead,
  };
}
