"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBanditSimulation } from "@/hooks/useBanditSimulation";
import { usePreferences } from "@/hooks/usePreferences";
import { argmaxAll, sampleMean, type AlgorithmId } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { playMiss, playReward, unlockAudio } from "@/lib/sound";
import { ChestCards } from "./panels/ChestCards";
import { ChoiceTimeline, HistoryCharts } from "./panels/Charts";
import { ComparePanel } from "./panels/ComparePanel";
import { ControlPanel, QuickControls } from "./panels/ControlPanel";
import { EventLog } from "./panels/EventLog";
import { LearnSection } from "./panels/LearnSection";
import { StatsPanel } from "./panels/StatsPanel";
import { ThoughtPanel } from "./panels/ThoughtPanel";
import { Card, SectionTitle } from "./ui";

const IslandScene = dynamic(() => import("./scene/IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm font-semibold text-white/90">
      <span className="animate-pulse">🏝️ 島を準備しています…</span>
    </div>
  ),
});

export default function BanditIslandApp() {
  const controller = useBanditSimulation();
  const { state, playing, speed } = controller;
  const { sim, pending, lastEvent } = state;
  const prefs = usePreferences();
  const [showTrueProbs, setShowTrueProbs] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Estimated best chest: highest observed success rate among tried chests (ties → more pulls).
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
  }, [lastEvent?.id]);

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

  const scenePending = pending ? { id: pending.id, arm: pending.decision.arm, mode: pending.decision.mode } : null;
  const sceneLast = lastEvent
    ? { id: lastEvent.id, arm: lastEvent.arm, reward: lastEvent.reward, mode: lastEvent.decision.mode }
    : null;
  const showIntro = sim.turn === 0 && !playing && !pending;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-5 sm:pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-sky-300 to-emerald-300 text-2xl shadow-lg shadow-sky-400/30">
            🏝️
          </div>
          <div>
            <h1 className="font-display text-3xl leading-none font-bold tracking-tight sm:text-4xl">
              <span className="bg-linear-to-r from-sky-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                Bandit Island
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-muted sm:text-base">
              アルゴリズムたちは、どの宝箱が一番当たりやすいのかをどうやって学ぶのでしょう？
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#learn"
            className="rounded-full border border-line bg-panel-solid/70 px-3 py-2 text-xs font-semibold text-ink hover:border-explore/50"
          >
            📘 はじめての方へ
          </a>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              prefs.toggleSound();
            }}
            aria-pressed={prefs.sound}
            className="rounded-full border border-line bg-panel-solid/70 px-3 py-2 text-xs font-semibold text-ink hover:border-explore/50"
          >
            {prefs.sound ? "🔊 効果音 ON" : "🔇 効果音 OFF"}
          </button>
          <button
            type="button"
            onClick={prefs.toggleTheme}
            aria-label={prefs.dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            className="rounded-full border border-line bg-panel-solid/70 px-3 py-2 text-xs font-semibold text-ink hover:border-explore/50"
          >
            {prefs.dark ? "☀️ 昼の島" : "🌙 夜の島"}
          </button>
        </div>
      </header>

      <div id="island" className="grid scroll-mt-4 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: scene + chests + charts */}
        <div className="min-w-0 space-y-5">
          <div className="sky relative h-[480px] overflow-hidden rounded-[2rem] border border-white/40 shadow-[0_30px_60px_-30px_rgba(30,64,175,0.45)] sm:h-[520px] lg:h-[600px] dark:border-white/10">
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

            {/* HUD */}
            <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2 sm:top-4 sm:left-4">
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold shadow">
                {ALGORITHM_INFO[state.algorithm].emoji} {ALGORITHM_INFO[state.algorithm].name}
              </span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold tabular-nums shadow">
                ターン {sim.turn.toLocaleString()}
              </span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-reward tabular-nums shadow">
                🪙 {sim.totalReward.toLocaleString()}
              </span>
              {!speed.animated && playing && (
                <span className="glass rounded-full px-3 py-1.5 text-xs font-bold shadow">⚡ {speed.label}</span>
              )}
            </div>
            <div className="pointer-events-none absolute top-3 right-3 hidden sm:top-4 sm:right-4 sm:block">
              <span className="glass rounded-full px-3 py-1.5 text-[11px] text-muted shadow">ドラッグで島を回転</span>
            </div>

            {showIntro && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/10 p-4 backdrop-blur-[2px]">
                <div className="glass animate-pop-in max-w-md rounded-3xl border border-white/50 p-6 text-center shadow-2xl">
                  <div className="text-4xl" aria-hidden>
                    🤖🧰
                  </div>
                  <h2 className="mt-2 text-lg font-bold">ようこそ、Bandit Island へ！</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    5つの宝箱には、それぞれ違う<strong className="text-ink">当たり確率</strong>
                    が隠されています。ロボットは開けて試しながら、一番当たりやすい箱を探します。
                    <br />
                    最初はいろいろ試す<strong className="text-explore">「探索」</strong>、だんだん良い箱に集中する
                    <strong className="text-exploit">「活用」</strong>に注目！
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudio();
                      play();
                    }}
                    className="mt-4 rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-violet-500/40 transition-transform hover:-translate-y-0.5"
                  >
                    ▶ 冒険をはじめる
                  </button>
                  <p className="mt-2 text-[11px] text-muted">アルゴリズムや速度は操作パネルで変更できます</p>
                </div>
              </div>
            )}

            <ThoughtPanel
              pending={pending}
              lastEvent={lastEvent}
              turn={sim.turn}
              animate={speed.animated}
              className="absolute right-4 bottom-4 left-4 z-20 hidden max-w-2xl sm:block"
            />
          </div>

          <QuickControls controller={controller} onUserGesture={unlockAudio} />
          <ThoughtPanel pending={pending} lastEvent={lastEvent} turn={sim.turn} animate={speed.animated} className="sm:hidden" />

          <ChestCards
            arms={sim.arms}
            probs={sim.probs}
            turn={sim.turn}
            algorithm={state.algorithm}
            showTrueProbs={showTrueProbs}
            showDetails={showDetails}
            estimatedBest={estimatedBest}
            lastArm={lastEvent?.arm ?? null}
            lastDecision={lastEvent?.decision ?? null}
            dark={prefs.dark}
          />

          <Card>
            <SectionTitle icon="📈">学習の様子</SectionTitle>
            <div className="space-y-6">
              <ChoiceTimeline choices={sim.history.choices} dark={prefs.dark} />
              <HistoryCharts
                cumReward={sim.history.cumReward}
                cumRegret={sim.history.cumRegret}
                algorithms={sim.history.algorithms}
                probs={sim.probs}
              />
            </div>
          </Card>
        </div>

        {/* Right: controls + stats */}
        <aside className="space-y-5">
          <ControlPanel
            controller={controller}
            showTrueProbs={showTrueProbs}
            onShowTrueProbs={setShowTrueProbs}
            showDetails={showDetails}
            onShowDetails={setShowDetails}
            onUserGesture={unlockAudio}
          />
          <StatsPanel
            algorithm={state.algorithm}
            turn={sim.turn}
            totalReward={sim.totalReward}
            cumulativeRegret={sim.cumulativeRegret}
            estimatedBest={estimatedBest}
            recentOptimalRate={recentOptimalRate}
          />
          <Card>
            <SectionTitle icon="📜">最近の出来事</SectionTitle>
            <EventLog log={state.log} />
          </Card>
        </aside>
      </div>

      <div className="mt-12 space-y-10">
        <LearnSection onTry={tryAlgorithm} />
        <ComparePanel probs={sim.probs} epsilon={state.epsilon} />
      </div>

      <footer className="mt-12 text-center text-xs text-muted">
        Bandit Island · Next.js + react-three-fiber で作られた、マルチアームド・バンディットの学習用シミュレーション
      </footer>
    </div>
  );
}
