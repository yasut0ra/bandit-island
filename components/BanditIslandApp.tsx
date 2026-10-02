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
import { CoinGlyph, FlagGlyph } from "./ui";

const IslandScene = dynamic(() => import("./scene/IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="f-pop animate-pulse text-[18px] text-white [text-shadow:0_2px_0_rgba(43,44,99,.35)]">島をつくっています…</span>
    </div>
  ),
});

const TITLE = "Bandit Island";

function IconButton({ onClick, label, pressed, children }: { onClick: () => void; label: string; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="candy candy--white h-11 w-11 text-[18px]"
    >
      {children}
    </button>
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
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 pt-7 pb-6 sm:pt-9">
        <div>
          <h1 className="logo text-[46px] leading-none sm:text-[64px]" aria-label={TITLE}>
            {[...TITLE].map((ch, i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties} aria-hidden>
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </h1>
          <p className="on-bg-text mt-3 text-[15px] font-extrabold sm:text-[17px]">
            アルゴリズムたちは、どの宝箱が一番当たりやすいのかをどうやって学ぶのでしょう？
          </p>
        </div>
        <nav className="flex items-center gap-3">
          <a href="#learn" className="candy candy--sun px-4 py-2 text-[13px]">
            あそびかた
          </a>
          <IconButton
            label={prefs.sound ? "効果音をオフにする" : "効果音をオンにする"}
            pressed={prefs.sound}
            onClick={() => {
              unlockAudio();
              prefs.toggleSound();
            }}
          >
            {prefs.sound ? "🔊" : "🔇"}
          </IconButton>
          <IconButton label={prefs.dark ? "昼の島に切り替え" : "夜の島に切り替え"} onClick={prefs.toggleTheme}>
            {prefs.dark ? "☀️" : "🌙"}
          </IconButton>
        </nav>
      </header>

      <main id="island" className="scroll-mt-4">
        {/* The island: the hero of the page */}
        <div className="stage-frame p-2 sm:p-2.5">
          <div className="stage relative h-[50vh] max-h-[720px] min-h-[380px] overflow-hidden rounded-[26px] sm:h-[calc(100svh-330px)] sm:min-h-[500px]">
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

            {/* game HUD counters */}
            <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap gap-2 sm:top-5 sm:left-5">
              <div className="counter">
                <span className="counter__icon bg-pink">
                  <FlagGlyph />
                </span>
                <span className="text-[11px] font-extrabold text-ink-2">ターン</span>
                <span className="f-num text-[22px] leading-none text-ink">{sim.turn.toLocaleString()}</span>
              </div>
              <div className="counter">
                <span className="counter__icon bg-sun">
                  <CoinGlyph />
                </span>
                <span className="f-num text-[22px] leading-none text-ink">{sim.totalReward.toLocaleString()}</span>
              </div>
            </div>
            <p className="on-bg-text pointer-events-none absolute top-5 right-6 z-20 hidden text-[12px] font-extrabold sm:block">
              ドラッグで島がまわるよ
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

        <div className="mt-24">
          <LearnSection onTry={tryAlgorithm} />
        </div>

        <div className="mt-24">
          <ComparePanel probs={sim.probs} epsilon={state.epsilon} />
        </div>
      </main>

      <footer className="on-bg-text mt-24 flex flex-wrap items-center justify-between gap-4 text-[13px] font-extrabold">
        <p>
          <span className="f-num text-[18px]">Bandit Island</span> ・ 宝箱で学ぶマルチアームド・バンディット
        </p>
        <p>Space 再生／ストップ ・ → 1歩 ・ R もう一度</p>
      </footer>
    </div>
  );
}
