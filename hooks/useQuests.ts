"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTS, isQuestDone, questById, type Quest, type QuestSnapshot } from "@/lib/quests";
import type { BanditController } from "./useBanditSimulation";

const STORAGE_KEY = "bandit-island:quests";

interface QuestSave {
  cleared: string[];
  active: string | null;
  /** Turns counted so far for the active counting quest. */
  count: number;
}

const EMPTY: QuestSave = { cleared: [], active: null, count: 0 };

function load(): QuestSave {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<QuestSave>;
    const known = new Set(QUESTS.map((q) => q.id));
    return {
      cleared: (parsed.cleared ?? []).filter((id) => known.has(id)),
      active: parsed.active && known.has(parsed.active) ? parsed.active : null,
      count: typeof parsed.count === "number" ? parsed.count : 0,
    };
  } catch {
    return EMPTY;
  }
}

function persist(save: QuestSave) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable — progress just won't survive a reload */
  }
}

/**
 * Quest mode: one active quest at a time. Counting quests add the turns played
 * while their condition holds; checking quests clear when their condition is met.
 * Progress is a per-viewer convenience kept in localStorage.
 */
export function useQuests(controller: BanditController, snapshot: QuestSnapshot, onClear?: (quest: Quest) => void) {
  const [save, setSave] = useState<QuestSave>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [justCleared, setJustCleared] = useState<Quest | null>(null);
  const prevTurn = useRef(snapshot.turn);

  useEffect(() => {
    setSave(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) persist(save);
  }, [save, loaded]);

  const active = questById(save.active);

  // Counting quests: credit the turns that just happened (a jump can add 1,000 at once).
  useEffect(() => {
    const delta = snapshot.turn - prevTurn.current;
    prevTurn.current = snapshot.turn;
    if (delta <= 0 || !active?.counts || !active.counts(snapshot)) return;
    setSave((s) => ({ ...s, count: s.count + delta }));
    // Only turn changes matter here; the snapshot is read as of this render.
  }, [snapshot.turn]);

  // Clear the active quest as soon as its goal is reached.
  useEffect(() => {
    if (!active || !isQuestDone(active, snapshot, save.count)) return;
    // Replaying a cleared quest celebrates again but doesn't duplicate the sticker.
    setSave((s) => ({ cleared: s.cleared.includes(active.id) ? s.cleared : [...s.cleared, active.id], active: null, count: 0 }));
    setJustCleared(active);
    onClear?.(active);
  }, [active, snapshot, save.count, onClear]);

  const start = useCallback(
    (quest: Quest) => {
      const setup = quest.setup;
      if (setup) {
        if (setup.mode !== controller.state.mode) controller.setMode(setup.mode);
        else if (setup.reset !== false) controller.reset();
        if (setup.algorithm) controller.setAlgorithm(setup.algorithm);
        if (setup.epsilon !== undefined) controller.setEpsilon(setup.epsilon);
        if (setup.aware !== undefined) controller.setContextAware(setup.aware);
      }
      controller.announce(quest.briefing);
      setJustCleared(null);
      setSave((s) => ({ ...s, active: quest.id, count: 0 }));
    },
    [controller],
  );

  const quit = useCallback(() => setSave((s) => ({ ...s, active: null, count: 0 })), []);
  const resetAll = useCallback(() => setSave(EMPTY), []);
  const dismissCleared = useCallback(() => setJustCleared(null), []);

  return {
    active,
    count: save.count,
    cleared: new Set(save.cleared),
    justCleared,
    start,
    quit,
    resetAll,
    dismissCleared,
  };
}

export type QuestController = ReturnType<typeof useQuests>;
