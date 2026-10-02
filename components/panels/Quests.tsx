"use client";

import { useState } from "react";
import type { QuestController } from "@/hooks/useQuests";
import { CHAPTERS, QUESTS, isUnlocked, questProgress, type Quest, type QuestSnapshot, type QuestSticker } from "@/lib/quests";
import { AlgoAvatar, ChestSticker, Ribbon, ThermoGlyph, WeatherGlyph } from "../ui";

/** The sticker you earn for a quest. */
export function StickerArt({ sticker, size = 40 }: { sticker: QuestSticker; size?: number }) {
  switch (sticker.kind) {
    case "algo":
      return <AlgoAvatar id={sticker.id} size={size} />;
    case "chest":
      return <ChestSticker color="#1baf7a" size={size} />;
    case "weather":
      return <WeatherGlyph context={sticker.context} size={size} />;
    case "thermo":
      return <ThermoGlyph value={0.75} size={size} />;
    case "vs":
      return (
        <span className="f-num flex items-center justify-center text-white [-webkit-text-stroke:4px_#2b2c63] [paint-order:stroke_fill]" style={{ width: size, height: size, fontSize: size * 0.55 }}>
          VS
        </span>
      );
  }
}

function LockIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" stroke="#a5a6d3" strokeWidth="2.4" fill="none" />
      <rect x="5.5" y="10.5" width="13" height="10" rx="3" fill="#d6d4f0" stroke="#a5a6d3" strokeWidth="2" />
    </svg>
  );
}

/** Slim bar above the island while a quest is running. */
export function QuestBar({ quests, snapshot }: { quests: QuestController; snapshot: QuestSnapshot }) {
  const [showHint, setShowHint] = useState(false);
  const quest = quests.active;
  if (!quest) return null;
  const chapter = CHAPTERS.find((c) => c.id === quest.chapter)!;
  const progress = questProgress(quest, snapshot, quests.count);
  const index = QUESTS.indexOf(quest);

  return (
    <div className="panel animate-pop-in mb-4 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="shrink-0 rounded-xl border-[2.5px] border-line bg-panel-2 p-0.5">
          <StickerArt sticker={quest.sticker} size={30} />
        </span>
        <div className="min-w-0 lg:w-[38%]">
          <div className="flex items-center gap-2">
            <span className="badge text-white" style={{ background: chapter.color }}>
              クエスト {index + 1}
            </span>
            <span className="f-pop truncate text-[15px] text-ink">{quest.title}</span>
          </div>
          <p className="truncate text-[12.5px] font-extrabold text-ink-2">🎯 {quest.goal}</p>
        </div>
        <div className="flex min-w-[180px] flex-1 items-center gap-2">
          <div className="meter flex-1">
            <i style={{ width: `${progress.value * 100}%`, background: "var(--sun)" }} />
          </div>
          <span className="f-pop shrink-0 text-[12px] text-ink">{progress.label}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowHint((v) => !v)} aria-pressed={showHint} className="chip">
            ヒント
          </button>
          <button type="button" onClick={quests.quit} className="chip">
            やめる
          </button>
        </div>
      </div>
      {showHint && <p className="panel-soft mt-2 px-3 py-1.5 text-[12.5px] font-bold text-ink-2">💡 {quest.hint}</p>}
    </div>
  );
}

/** The world map of quests, grouped by chapter. */
export function QuestMap({ quests, onStart }: { quests: QuestController; onStart: (quest: Quest) => void }) {
  const firstOpen = QUESTS.findIndex((q, i) => isUnlocked(i, quests.cleared) && !quests.cleared.has(q.id));
  const [selected, setSelected] = useState<number | null>(null);
  const shown = selected ?? (firstOpen === -1 ? QUESTS.length - 1 : firstOpen);
  const quest = QUESTS[shown];
  const allClear = quests.cleared.size === QUESTS.length;

  return (
    <section id="quests" className="scroll-mt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <Ribbon color="var(--sun)" sub="ミッションをクリアしながら、探索と活用、文脈付きバンディットを順番に学ぼう。クリアするとシールがもらえるよ。">
          クエスト
        </Ribbon>
        <div className="flex items-center gap-2">
          <span className="chip">
            シール {quests.cleared.size} / {QUESTS.length}
          </span>
          {quests.cleared.size > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                if (window.confirm("クエストの進み具合をリセットしますか？")) quests.resetAll();
              }}
            >
              最初から
            </button>
          )}
        </div>
      </div>

      <div className="panel p-4 sm:p-6">
        {allClear && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border-[3px] border-line bg-sun px-4 py-3 shadow-[0_4px_0_var(--drop)]">
            <span className="text-[28px]" aria-hidden>
              👑
            </span>
            <div>
              <div className="f-pop text-[18px] text-[#2b2c63]">称号「バンディットマスター」</div>
              <div className="text-[13px] font-bold text-[#2b2c63]">全部のクエストをクリア！ 島のすべてのひみつを見つけました。</div>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {CHAPTERS.map((chapter) => (
            <div key={chapter.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="f-pop text-[15px] text-ink">
                  第{chapter.id}章 {chapter.title}
                </span>
                <span className="text-[12px] font-bold text-ink-3">{chapter.sub}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {QUESTS.map((q, i) => {
                  if (q.chapter !== chapter.id) return null;
                  const unlocked = isUnlocked(i, quests.cleared);
                  const cleared = quests.cleared.has(q.id);
                  const isActive = quests.active?.id === q.id;
                  return (
                    <div key={q.id} className="flex items-center gap-2">
                      {QUESTS[i - 1]?.chapter === chapter.id && <span className="h-1 w-5 rounded-full bg-panel-3 sm:w-8" aria-hidden />}
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        aria-label={`クエスト${i + 1} ${unlocked ? q.title : "（まだ開いていません）"}`}
                        aria-pressed={shown === i}
                        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-line shadow-[0_4px_0_var(--drop)] transition-transform hover:-translate-y-0.5 ${
                          cleared ? "bg-exploit-soft" : unlocked ? "bg-panel" : "bg-panel-2"
                        } ${shown === i ? "ring-4 ring-sun" : ""}`}
                      >
                        {unlocked ? <StickerArt sticker={q.sticker} size={cleared ? 40 : 34} /> : <LockIcon />}
                        <span className="f-num absolute -top-2 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line bg-panel text-[12px] text-ink">
                          {i + 1}
                        </span>
                        {cleared && (
                          <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-line bg-mint text-[12px] font-extrabold text-white">
                            ✓
                          </span>
                        )}
                        {isActive && <span className="badge badge--exploit absolute -bottom-3 left-1/2 -translate-x-1/2 !text-[9px]">挑戦中</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* details of the selected quest */}
        <div className="panel-soft mt-6 flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <span className="w-fit shrink-0 rounded-2xl border-[3px] border-line bg-panel p-1.5">
            {isUnlocked(shown, quests.cleared) ? <StickerArt sticker={quest.sticker} size={52} /> : <LockIcon size={52} />}
          </span>
          <div className="w-full min-w-0 flex-1">
            <div className="f-pop text-[17px] text-ink">
              クエスト {shown + 1}：{isUnlocked(shown, quests.cleared) ? quest.title : "？？？"}
            </div>
            {isUnlocked(shown, quests.cleared) ? (
              <>
                <p className="mt-1 text-[13.5px] font-extrabold text-ink-2">🎯 {quest.goal}</p>
                {quests.cleared.has(quest.id) && <p className="mt-2 text-[13px] leading-relaxed font-bold text-ink-2">📖 {quest.lesson}</p>}
              </>
            ) : (
              <p className="mt-1 text-[13.5px] font-bold text-ink-2">ひとつ前のクエストをクリアすると開きます。</p>
            )}
          </div>
          {isUnlocked(shown, quests.cleared) && (
            <button type="button" onClick={() => onStart(quest)} className="candy shrink-0 self-start px-6 py-2.5 text-[15px] sm:self-auto">
              {quests.active?.id === quest.id ? "最初からやり直す" : quests.cleared.has(quest.id) ? "もう一度あそぶ" : "このクエストをはじめる"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const CONFETTI_COLORS = ["#ff6fae", "#ffc93c", "#4db5ff", "#2fd3a0", "#9a7bff"];

/** Celebration when a quest is cleared: confetti, the sticker and what we learned. */
export function QuestClearModal({ quest, next, onNext, onClose }: { quest: Quest; next: Quest | null; onNext: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2b2c63]/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="クエストクリア">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 9) * 0.12}s`,
              animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="panel animate-pop-in relative w-full max-w-md px-6 pt-8 pb-6 text-center">
        <div className="logo text-[34px] leading-none">CLEAR!</div>
        <div className="mx-auto mt-5 w-fit rounded-[28px] border-[3px] border-line bg-exploit-soft p-3 shadow-[0_4px_0_var(--drop)]">
          <StickerArt sticker={quest.sticker} size={72} />
        </div>
        <div className="f-pop mt-4 text-[19px] text-ink">{quest.title}</div>
        <div className="text-[12.5px] font-extrabold text-ink-3">シールをゲット！</div>
        <div className="panel-soft mt-4 px-4 py-3 text-left">
          <div className="f-pop text-[13px] text-ink">わかったこと</div>
          <p className="mt-1 text-[13.5px] leading-[1.8] font-bold text-ink-2">{quest.lesson}</p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {next && (
            <button type="button" onClick={onNext} className="candy px-6 py-2.5 text-[15px]">
              次のクエストへ ▶
            </button>
          )}
          <button type="button" onClick={onClose} className="candy candy--white px-5 py-2.5 text-[14px]">
            {next ? "あとで" : "とじる"}
          </button>
        </div>
      </div>
    </div>
  );
}
