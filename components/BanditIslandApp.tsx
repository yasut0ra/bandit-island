"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBanditSimulation } from "@/hooks/useBanditSimulation";
import { usePreferences } from "@/hooks/usePreferences";
import { argmaxAll, sampleMean, type AlgorithmId } from "@/lib/bandits/index.ts";
import { playMiss, playReward, unlockAudio } from "@/lib/sound";
import { ChestLedger } from "./panels/ChestLedger";
import { ComparePanel } from "./panels/ComparePanel";
import { ControlDeck } from "./panels/ControlDeck";
import { LearnSection } from "./panels/LearnSection";
import { Logbook } from "./panels/Logbook";
import { SpeechBubble } from "./panels/SpeechBubble";
import { CoinGlyph } from "./ui";

const IslandScene = dynamic(() => import("./scene/IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="t-display animate-pulse text-[18px] text-ink-2 italic">島を描いています…</span>
    </div>
  ),
});

function IslandMark() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <ellipse cx="24" cy="26" rx="19" ry="6.5" fill="#a3cf7d" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M6 27 Q 24 50 42 27" fill="#c98d5a" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 24 h12 v-4 a6 4.5 0 0 0 -12 0 z" fill="#1baf7a" stroke="var(--ink)" strokeWidth="1.4" />
      <rect x="17" y="21.5" width="12" height="4.5" rx="0.8" fill="#9a6035" stroke="var(--ink)" strokeWidth="1.4" />
      <path d="M35 22 v-12 M35 10 l6 2.5 -6 2.5" fill="#c07a1e" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function BanditIslandApp() {
  const controller = useBanditSimulation();
  const { state, playing, speed } = controller;
  const { sim, pending, lastEvent, notice } = state;
  const prefs = usePreferences();
  const [showTrueProbs, setShowTrueProbs] = useState(false);

  // Pico's current favourite: highest observed success rate among tried chests (ties → more pulls).
  const estimatedBest = useMemo(() => {
    if (sim.turn === 0) return null;
    const means = sim.arms.map((a) => (a.pulls > 0 ? sampleMean(a) : -1));
    const leaders = argmaxAll(means);
    return leaders.reduce((best, i) => (sim.arms[i].pulls > sim.arms[best].pulls ? i : best), leaders[0]);
  }, [sim.arms, sim.turn]);

  const recentOptimalRate = useMemo(() => {
    const choices = sim.history.choices;
    if (choices.length === 0) return null;
    const best = Math.max(...sim.probs);
    const recent = choices.slice(-100);
    return recent.filter((arm) => sim.probs[arm] === best).length / recent.length;
  }, [sim.history.choices, sim.probs]);

  // Sound effects (only while the animation is slow enough to follow).
  useEffect(() => {
    if (!lastEvent || !prefs.sound || !speed.animated) return;
    if (lastEvent.reward === 1) playReward(speed.turnMs >= 1000);
    else if (speed.turnMs >= 1000) playMiss();
  }, [lastEvent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { play, pause, step, reset } = controller;
  // Keyboard shortcuts: Space = play/pause, → = step, R = reset.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, select, textarea, button, [role=switch]") || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        unlockAudio();
        if (playing) pause();
        else play();
      } else if (e.key === "ArrowRight") {
        unlockAudio();
        if (!playing) step();
      } else if (e.key === "r" || e.key === "R") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, pause, step, reset]);

  const tryAlgorithm = useCallback(
    (id: AlgorithmId) => {
      controller.setAlgorithm(id);
      document.getElementById("island")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [controller],
  );

  const start = () => {
    unlockAudio();
    play();
  };

  const scenePending = pending ? { id: pending.id, arm: pending.decision.arm, mode: pending.decision.mode } : null;
  const sceneLast = lastEvent
    ? { id: lastEvent.id, arm: lastEvent.arm, reward: lastEvent.reward, mode: lastEvent.decision.mode }
    : null;
  const notStarted = sim.turn === 0 && !playing && !pending;
  const bubbleProps = {
    pending,
    lastEvent,
    notice,
    turn: sim.turn,
    animate: speed.animated,
    onStart: notStarted ? start : undefined,
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-7 pb-6 sm:pt-9">
        <div>
          <div className="flex items-center gap-3">
            <IslandMark />
            <h1 className="t-display text-[42px] leading-none text-ink italic sm:text-[52px]">Bandit Island</h1>
          </div>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2 sm:text-[16px]">
            アルゴリズムたちは、どの宝箱が一番当たりやすいのかをどうやって学ぶのでしょう？
          </p>
        </div>
        <nav className="flex items-center gap-5 text-[14px] text-ink-2">
          <a href="#learn" className="squiggle text-ink hover:text-exploit">
            はじめての方へ
          </a>
          <button
            type="button"
            aria-pressed={prefs.sound}
            onClick={() => {
              unlockAudio();
              prefs.toggleSound();
            }}
            className="hover:text-ink"
          >
            効果音 {prefs.sound ? "あり" : "なし"}
          </button>
          <button
            type="button"
            onClick={prefs.toggleTheme}
            aria-label={prefs.dark ? "昼の島に切り替え" : "夜の島に切り替え"}
            className="rounded-full border border-rule px-3 py-1 hover:border-ink-3 hover:text-ink"
          >
            {prefs.dark ? "昼の島へ" : "夜の島へ"}
          </button>
        </nav>
      </header>

      <main id="island" className="scroll-mt-4">
        {/* The island: the hero of the page */}
        <div className="plate rounded-[28px] p-2 sm:p-2.5">
          <div className="sky relative h-[50vh] max-h-[720px] min-h-[380px] overflow-hidden rounded-[20px] sm:h-[calc(100svh-290px)] sm:min-h-[520px]">
            <IslandScene
              probs={sim.probs}
              arms={sim.arms}
              turn={sim.turn}
              showTrueProbs={showTrueProbs}
              pending={scenePending}
              lastEvent={sceneLast}
              turnMs={speed.turnMs}
              estimatedBest={estimatedBest}
              dark={prefs.dark}
            />

            {/* pinned paper tag with the running tally */}
            <div className="sheet pointer-events-none absolute top-4 left-4 z-20 -rotate-2 rounded-[3px] px-4 pt-3 pb-2.5 sm:top-6 sm:left-6">
              <span className="tape -top-2.5 left-1/2 -translate-x-1/2 rotate-3" aria-hidden />
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-ink-2">ターン</div>
                  <div className="t-num text-[28px] leading-none text-ink">{sim.turn.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1.5 pb-0.5">
                  <CoinGlyph size={16} />
                  <span className="t-num text-[20px] leading-none text-ink">{sim.totalReward.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <p className="pointer-events-none absolute top-5 right-6 z-20 hidden text-[12px] tracking-wider text-ink-2/80 sm:block">
              ドラッグで島がまわります
            </p>

            <SpeechBubble
              {...bubbleProps}
              tail
              className="absolute bottom-12 left-6 z-20 hidden w-[min(480px,calc(100%-3rem))] sm:block"
            />
          </div>
        </div>

        <SpeechBubble {...bubbleProps} className="mt-4 sm:hidden" />

        <div className="relative z-10 mt-4 sm:-mt-7 sm:px-6">
          <ControlDeck controller={controller} onUserGesture={unlockAudio} />
        </div>

        <div className="mt-16 sm:mt-20">
          <ChestLedger
            arms={sim.arms}
            probs={sim.probs}
            algorithm={state.algorithm}
            showTrueProbs={showTrueProbs}
            onShowTrueProbs={setShowTrueProbs}
            estimatedBest={estimatedBest}
            lastArm={lastEvent?.arm ?? null}
            lastDecision={lastEvent?.decision ?? null}
            dark={prefs.dark}
          />
        </div>

        <div className="mt-24">
          <Logbook
            turn={sim.turn}
            totalReward={sim.totalReward}
            cumulativeRegret={sim.cumulativeRegret}
            estimatedBest={estimatedBest}
            recentOptimalRate={recentOptimalRate}
            choices={sim.history.choices}
            cumReward={sim.history.cumReward}
            cumRegret={sim.history.cumRegret}
            algorithms={sim.history.algorithms}
            probs={sim.probs}
            dark={prefs.dark}
          />
        </div>

        <div className="mt-28 border-t border-rule pt-20">
          <LearnSection onTry={tryAlgorithm} />
        </div>

        <div className="mt-28 border-t border-rule pt-20">
          <ComparePanel probs={sim.probs} epsilon={state.epsilon} />
        </div>
      </main>

      <footer className="mt-28">
        <div className="rule-dotted" />
        <div className="flex flex-wrap items-baseline justify-between gap-4 pt-6 text-[13px] text-ink-2">
          <p>
            <span className="t-display text-[16px] text-ink italic">Bandit Island</span> — 宝箱で学ぶマルチアームド・バンディット
          </p>
          <p>Space 再生／ひと休み　→ 1歩　R やり直し</p>
        </div>
      </footer>
    </div>
  );
}
