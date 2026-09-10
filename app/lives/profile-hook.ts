"use client";

// The learning profile on this device (PRD §63–§65), read once on mount and rewritten through
// the engine's reducers, so every Lives screen holds the same object the tests hold.

import { useCallback, useEffect, useState } from "react";
import { deviceLearningStorage } from "@/learn/cursor";
import { emptyProfile, readProfile, type LearningProfile } from "@/lives";

type Storage = typeof deviceLearningStorage;

export function useProfile(): { profile: LearningProfile | null; apply: (change: (storage: Storage) => LearningProfile) => void; storage: Storage } {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  useEffect(() => { try { setProfile(readProfile(deviceLearningStorage)); } catch { setProfile(emptyProfile()); } }, []);
  const apply = useCallback((change: (storage: Storage) => LearningProfile) => { try { setProfile(change(deviceLearningStorage)); } catch { /* denied storage: the screen keeps what it has */ } }, []);
  return { profile, apply, storage: deviceLearningStorage };
}

/** The device remembers that the run's three-card tutorial has been seen. */
export const LIVES_TUTORED_KEY = "adhdme.lives.tutored";
/** §93: relaxed timing (half as long again on every clock) and larger instructions, on this device. */
export const LIVES_RELAXED_KEY = "adhdme.lives.relaxed";
export const LIVES_LARGE_KEY = "adhdme.lives.large";
/** §93: reduced flashing (no rapid alternation), reduced sensory effects (fewer things competing on the field) and haptics (off by default), on this device. */
export const LIVES_REDUCED_FLASHING_KEY = "adhdme.lives.reduced-flashing";
export const LIVES_REDUCED_SENSORY_KEY = "adhdme.lives.reduced-sensory";
export const LIVES_HAPTICS_KEY = "adhdme.lives.haptics";
export function readFlag(key: string): boolean { try { return deviceLearningStorage.getItem(key) === "1"; } catch { return false; } }
export function writeFlag(key: string, on: boolean): void { try { if (on) deviceLearningStorage.setItem(key, "1"); else deviceLearningStorage.removeItem(key); } catch { /* memory only */ } }
