"use client";

import type { Notice, PendingTurn, TurnEvent } from "@/hooks/useBanditSimulation";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS, EXPLOIT_COLOR, EXPLORE_COLOR } from "@/lib/island";
import { PicoFace, Stamp } from "../ui";

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
    <div className={`bubble ${tail ? "bubble--tail" : ""} px-5 pt-4 pb-4 sm:px-6 ${className}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="-mt-0.5 shrink-0">
          <PicoFace antenna={antenna} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
            <span className="font-bold whitespace-nowrap text-ink">ピコの考えごと</span>
            {current && (
              <span className="t-num whitespace-nowrap">
                {ALGORITHM_INFO[current.algorithm].name} ・ {pending ? turn + 1 : lastEvent?.turn}ターン目
              </span>
            )}
            {current && <Stamp mode={current.decision.mode} className="ml-auto" />}
          </div>

          {current ? (
            <div key={animate ? current.id : "static"} className={animate ? "animate-fade-slide" : undefined}>
              <p className="mt-1.5 text-[15px] leading-[1.85] text-ink">{current.reason}</p>
              <p className="mt-1.5 text-[14px] text-ink-2">
                {pending ? (
                  <>「{chest?.name}」へ歩いていく…</>
                ) : lastEvent?.reward === 1 ? (
                  <>
                    「{chest?.name}」を開けたら、<span className="font-bold text-reward">当たり！</span>
                  </>
                ) : (
                  <>「{chest?.name}」を開けたら、からっぽ。</>
                )}
              </p>
            </div>
          ) : (
            <div>
              <p className="mt-1.5 text-[15px] leading-[1.85] text-ink">
                こんにちは、ピコです。5つの宝箱には、それぞれ違う当たりやすさが隠れています。
                どれが一番かはまだ知りません。開けて、試して、少しずつ覚えていきます。
              </p>
              {onStart && (
                <button type="button" onClick={onStart} className="brass mt-3 rounded-full px-5 py-2 text-[14px] font-bold">
                  冒険をはじめる
                </button>
              )}
            </div>
          )}
          {showNotice && <p className="mt-2 border-t border-dashed border-rule pt-2 text-[13px] text-ink-2">{notice.text}</p>}
        </div>
      </div>
    </div>
  );
}
