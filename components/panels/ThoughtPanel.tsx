"use client";

import type { PendingTurn, TurnEvent } from "@/hooks/useBanditSimulation";
import { ALGORITHM_INFO } from "@/lib/explain";
import { CHESTS } from "@/lib/island";
import { ModeBadge } from "../ui";

interface ThoughtPanelProps {
  pending: PendingTurn | null;
  lastEvent: TurnEvent | null;
  turn: number;
  /** Disable the per-turn fade when turns fly by (fast speeds). */
  animate?: boolean;
  className?: string;
}

/** "What the robot is thinking": the Japanese reason behind the latest choice. */
export function ThoughtPanel({ pending, lastEvent, turn, animate = true, className = "" }: ThoughtPanelProps) {
  const current = pending ?? lastEvent;
  const chest = current ? CHESTS[current.decision.arm] : null;

  return (
    <div className={`glass rounded-2xl border border-line/70 p-3.5 shadow-lg sm:p-4 ${className}`} aria-live="polite">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-lg" aria-hidden>
          🤖
        </span>
        <span className="text-xs font-bold text-muted">ロボットの考えていること</span>
        {current && (
          <>
            <span className="rounded-full bg-panel-soft px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-line">
              {ALGORITHM_INFO[current.algorithm].name} · ターン {pending ? turn + 1 : lastEvent?.turn}
            </span>
            <ModeBadge mode={current.decision.mode} />
          </>
        )}
      </div>

      {current ? (
        <div key={animate ? current.id : "static"} className={animate ? "animate-fade-slide" : undefined}>
          <p className="text-[13px] leading-relaxed text-ink sm:text-sm">{current.reason}</p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: chest?.color }} />
            {pending ? (
              <span className="text-muted">「{chest?.name}」へ移動中… 🚶</span>
            ) : lastEvent?.reward === 1 ? (
              <span className="text-reward">「{chest?.name}」を開けたら… 🪙 当たり！</span>
            ) : (
              <span className="text-muted">「{chest?.name}」を開けたら… 💨 ハズレ</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted sm:text-sm">
          ▶ 再生 か「1ターン進める」を押すと、ロボットが宝箱を選び始めます。選んだ理由がここに表示されます。
        </p>
      )}
    </div>
  );
}
