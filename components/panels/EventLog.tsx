"use client";

import type { LogEntry } from "@/hooks/useBanditSimulation";
import { CHESTS } from "@/lib/island";
import { ModeBadge } from "../ui";

export function EventLog({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return <p className="text-xs text-muted">まだ記録がありません。</p>;
  }
  return (
    <ol className="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
      {log.slice(0, 14).map((entry) =>
        entry.kind === "note" ? (
          <li key={`n${entry.id}`} className="rounded-xl bg-panel-soft px-2.5 py-1.5 text-[11px] leading-snug text-muted">
            ℹ️ {entry.text}
          </li>
        ) : (
          <li key={`t${entry.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-panel-soft">
            <span className="w-12 shrink-0 font-mono text-[10px] text-muted tabular-nums">#{entry.event.turn}</span>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: CHESTS[entry.event.arm].color }} />
            <span className="w-12 shrink-0 font-semibold">{CHESTS[entry.event.arm].name}</span>
            <span className={`w-14 shrink-0 font-semibold ${entry.event.reward ? "text-reward" : "text-muted"}`}>
              {entry.event.reward ? "🪙 当たり" : "💨 ハズレ"}
            </span>
            <span className="ml-auto">
              <ModeBadge mode={entry.event.decision.mode} size="sm" />
            </span>
          </li>
        ),
      )}
    </ol>
  );
}
