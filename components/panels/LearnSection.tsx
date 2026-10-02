"use client";

import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { AlgoAvatar, KeyGlyph, Ribbon } from "../ui";

const NOTES = [
  {
    title: "マルチアームド・バンディット",
    en: "Multi-Armed Bandit",
    color: "var(--sky)",
    body: "どの選択肢が一番良いか分からない状態で、試しながら最良の選択肢を見つける問題。腕（アーム）がたくさんあるスロットマシンが名前の由来で、この島では5つの宝箱が腕です。",
  },
  {
    title: "探索",
    en: "Exploration",
    color: "var(--grape)",
    body: "まだよく分からない選択肢を試して、新しい情報を集めること。すぐ得するとは限らないけど、もっと良い箱を見落とさないために大事！",
  },
  {
    title: "活用",
    en: "Exploitation",
    color: "var(--sun)",
    body: "今までの結果から、一番良さそうな選択肢を選ぶこと。確実に稼げるけど、活用ばかりだと本当の一番に気づけないかも。",
  },
  {
    title: "累積後悔",
    en: "Cumulative Regret",
    color: "var(--pink)",
    body: "最初から一番良い箱だけを開けていれば得られたはずの報酬との差。かしこい探検家ほど、後悔がすぐ増えなくなります。",
  },
];

const KEY = [
  { glyph: "fog", title: "紫のもや", body: "まだよく分からない箱。試すほど晴れていく" },
  { glyph: "trail", title: "道と足あと", body: "よく選ぶ箱ほど、道がくっきり" },
  { glyph: "coins", title: "コインの山", body: "その箱で当たった回数" },
  { glyph: "star", title: "回る星", body: "ピコが「いまの本命」と思っている箱" },
  { glyph: "antenna", title: "アンテナの色", body: "紫なら探索中、黄色なら活用中" },
] as const;

export function LearnSection({ onTry }: { onTry: (id: AlgorithmId) => void }) {
  return (
    <section id="learn" className="scroll-mt-6 space-y-14">
      <div>
        <Ribbon color="var(--pink)" sub="むずかしい数学はいりません。4つの言葉だけ覚えれば、島で起きていることが分かるよ。">
          あそびかた
        </Ribbon>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NOTES.map((n, i) => (
            <li key={n.title} className="panel relative px-5 pt-7 pb-5">
              <span
                className="f-num absolute -top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-line text-[22px] text-white shadow-[0_3px_0_var(--drop)]"
                style={{ background: n.color, textShadow: "0 2px 0 rgba(43,44,99,.3)" }}
              >
                {i + 1}
              </span>
              <h3 className="f-pop text-[17px] leading-snug text-ink">{n.title}</h3>
              <div className="f-num text-[13px] text-ink-3">{n.en}</div>
              <p className="mt-2 text-[14px] leading-[1.8] font-bold text-ink-2">{n.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel px-5 py-5 sm:px-7">
        <h3 className="f-pop text-[17px] text-ink">島の見かた</h3>
        <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          {KEY.map((k) => (
            <li key={k.title} className="flex items-center gap-3">
              <span className="shrink-0">
                <KeyGlyph kind={k.glyph} />
              </span>
              <div>
                <div className="text-[14px] font-extrabold text-ink">{k.title}</div>
                <p className="text-[12.5px] leading-snug font-bold text-ink-2">{k.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Ribbon color="var(--grape)" sub="同じ島でも、だれが探検するかで「探索」と「活用」のバランスが変わります。">
          キャラクター図鑑
        </Ribbon>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {ALGORITHM_IDS.map((id, i) => {
            const info = ALGORITHM_INFO[id];
            return (
              <li key={id} className="panel flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl border-[3px] border-line bg-panel-2 p-1.5">
                    <AlgoAvatar id={id} size={52} />
                  </span>
                  <div>
                    <div className="f-num text-[11px] tracking-widest text-ink-3">No.{String(i + 1).padStart(2, "0")}</div>
                    <div className="f-num text-[24px] leading-tight text-ink">{info.name}</div>
                    <div className="text-[13px] font-extrabold text-ink-2">{info.tagline}</div>
                  </div>
                </div>
                <p className="mt-4 text-[14px] leading-[1.85] font-bold text-ink">{info.description}</p>
                <p className="panel-soft mt-3 px-3.5 py-2 text-[13px] leading-relaxed font-bold text-ink-2">💭 {info.analogy}</p>
                <div className="mt-3 grid gap-2 text-[13px] font-bold sm:grid-cols-2">
                  <p className="rounded-xl bg-[#dcfaef] px-3 py-1.5 text-[#1d6b52] dark:bg-[#1f4d48] dark:text-[#bff5e1]">とくい：{info.strength}</p>
                  <p className="rounded-xl bg-[#ffe3ef] px-3 py-1.5 text-[#9a2f5e] dark:bg-[#5a2a49] dark:text-[#ffd3e5]">にがて：{info.weakness}</p>
                </div>
                <button type="button" onClick={() => onTry(id)} className="candy candy--grape mt-4 self-start px-5 py-1.5 text-[13px]">
                  この島で遊ぶ ↑
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
