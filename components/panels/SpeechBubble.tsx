"use client";

import type { Notice, PendingTurn, TurnEvent } from "@/hooks/useBanditSimulation";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, EXPLOIT_COLOR, EXPLORE_COLOR } from "@/lib/island";
import { ModeBadge, PicoFace } from "../ui";

interface SpeechBubbleProps {
  pending: PendingTurn | null;
  lastEvent: TurnEvent | null;
  notice: Notice | null;
  turn: number;
  /** Disable the per-turn fade when turns fly by (fast speeds). */
  animate?: boolean;
  /** Draw the tail pointing up at the robot (when overlaid on the island). */
  tail?: boolean;
  /** Shown before the first turn: lets the greeting double as the "start" prompt. */
  onStart?: () => void;
  className?: string;
}

/** Pico's thoughts: why this chest, this turn — the second focal point after the island. */
export function SpeechBubble({ pending, lastEvent, notice, turn, animate = true, tail = false, onStart, className = "" }: SpeechBubbleProps) {
  const current = pending ?? lastEvent;
  const chest = current ? CHESTS[current.decision.arm] : null;
  const showNotice = notice && notice.id > (current?.id ?? -1);
  const antenna = current ? (current.decision.mode === "explore" ? EXPLORE_COLOR : EXPLOIT_COLOR) : undefined;

  return (
    <div className={`bubble ${tail ? "bubble--tail" : ""} px-4 pt-3.5 pb-4 sm:px-5 ${className}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full border-[2.5px] border-line bg-panel-2 p-0.5">
          <PicoFace antenna={antenna} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="f-pop text-[15px] whitespace-nowrap text-ink">ピコ</span>
            {current && (
              <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-ink-2">
                {ALGORITHM_INFO[current.algorithm].name} ・ {pending ? turn + 1 : lastEvent?.turn}ターン目
              </span>
            )}
            {current && <ModeBadge mode={current.decision.mode} className="ml-auto" />}
          </div>

          {current ? (
            <div key={animate ? current.id : "static"} className={animate ? "animate-fade-slide" : undefined}>
              <p className="mt-1.5 text-[14.5px] leading-[1.8] font-bold text-ink">{current.reason}</p>
              <p className="mt-2 text-[14px] font-extrabold">
                {pending ? (
                  <span className="text-ink-2">「{chest?.name}」へ てくてく…</span>
                ) : lastEvent?.reward === 1 ? (
                  <span className="rounded-full bg-sun px-2.5 py-0.5 text-[#2b2c63]">「{chest?.name}」を開けたら… あたり！</span>
                ) : (
                  <span className="text-ink-2">「{chest?.name}」を開けたら… からっぽ。</span>
                )}
              </p>
            </div>
          ) : (
            <div>
              <p className="mt-1.5 text-[14.5px] leading-[1.8] font-bold text-ink">
                こんにちは、ピコだよ！ 5つの宝箱には、それぞれ違う「当たりやすさ」がかくれてるんだ。
                どれが一番かはまだ知らないから、開けて、試して、覚えていくね。
              </p>
              {onStart && (
                <button type="button" onClick={onStart} className="candy mt-3 px-6 py-2 text-[15px]">
                  ▶ 冒険スタート！
                </button>
              )}
            </div>
          )}
          {showNotice && <p className="mt-2.5 rounded-xl bg-panel-2 px-3 py-1.5 text-[12.5px] font-bold text-ink-2">{notice.text}</p>}
        </div>
      </div>
    </div>
  );
}
