"use client";

import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { Heading, KeyGlyph } from "../ui";

const NOTES = [
  {
    title: "マルチアームド・バンディット",
    en: "Multi-Armed Bandit",
    body: "どの選択肢が一番良いか分からない状態で、試しながら最良の選択肢を見つける問題です。腕（アーム）がたくさんあるスロットマシンが名前の由来。この島では5つの宝箱が腕です。",
  },
  {
    title: "探索",
    en: "Exploration",
    body: "まだよく分からない選択肢を試して、新しい情報を集めること。すぐ得をするとは限りませんが、もっと良い箱を見落とさないために欠かせません。",
  },
  {
    title: "活用",
    en: "Exploitation",
    body: "今までの結果から、一番良さそうな選択肢を選ぶこと。確実に稼げる一方、活用ばかりだと、本当の一番に気づけないかもしれません。",
  },
  {
    title: "累積後悔",
    en: "Cumulative Regret",
    body: "最初から一番良い箱だけを開けていれば得られたはずの報酬との差。賢い探検家ほど、この後悔がすぐに増えなくなります。",
  },
];

const KEY = [
  { glyph: "fog", title: "紫のもや", body: "まだよく分からない箱。試すほど晴れていく。" },
  { glyph: "trail", title: "道と足あと", body: "よく選ぶ箱ほど、道がくっきり残る。" },
  { glyph: "coins", title: "コインの山", body: "その箱で当たった回数。" },
  { glyph: "star", title: "回る星", body: "ピコが「いまの本命」と考えている箱。" },
  { glyph: "antenna", title: "アンテナの色", body: "紫なら探索中、黄土色なら活用中。" },
] as const;

export function LearnSection({ onTry }: { onTry: (id: AlgorithmId) => void }) {
  return (
    <section id="learn" className="scroll-mt-6">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <Heading kicker="ii.">探索と、活用。</Heading>
          <p className="mt-5 text-[17px] leading-[2] text-ink">
            ピコの前には5つの宝箱。どれが一番当たりやすいかは、開けてみないと分かりません。
            知らない箱を試すか、良さそうな箱を開け続けるか。その迷いこそが、この島のテーマです。
          </p>
          <p className="mt-4 text-[15px] leading-[1.9] text-ink-2">数学を知らなくても大丈夫。4つの言葉だけ覚えれば、島で起きていることが読めるようになります。</p>
        </div>
        <ol>
          {NOTES.map((n, i) => (
            <li key={n.title} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-t border-rule py-5 first:border-t-0 first:pt-1">
              <span className="t-display text-[28px] leading-none text-exploit italic">{i + 1}</span>
              <div>
                <h3 className="text-[17px] font-bold text-ink">
                  {n.title} <span className="t-display ml-1 text-[14px] font-normal text-ink-3 italic">{n.en}</span>
                </h3>
                <p className="mt-1.5 text-[15px] leading-[1.85] text-ink-2">{n.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-16">
        <h3 className="text-[17px] font-bold text-ink">島の見かた</h3>
        <div className="rule-dotted mt-3" />
        <ul className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {KEY.map((k) => (
            <li key={k.title} className="flex gap-3">
              <KeyGlyph kind={k.glyph} />
              <div>
                <div className="text-[15px] font-bold text-ink">{k.title}</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{k.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-20">
        <Heading kicker="iii.">4人の探検家</Heading>
        <p className="mt-3 max-w-2xl text-[15px] leading-[1.9] text-ink-2">同じ島でも、誰が探検するかで「探索」と「活用」のバランスが変わります。</p>
        <ul className="mt-8">
          {ALGORITHM_IDS.map((id) => {
            const info = ALGORITHM_INFO[id];
            return (
              <li key={id} className="grid gap-x-10 gap-y-3 border-t border-rule py-7 md:grid-cols-[12rem_minmax(0,1fr)_17rem]">
                <div>
                  <div className="t-display text-[26px] leading-tight text-ink italic">{info.name}</div>
                  <div className="mt-1 text-[14px] text-ink-2">{info.tagline}</div>
                </div>
                <div>
                  <p className="text-[15px] leading-[1.9] text-ink">{info.description}</p>
                  <p className="mt-3 border-l-2 border-exploit/60 pl-3 text-[14px] leading-relaxed text-ink-2">{info.analogy}</p>
                </div>
                <div className="text-[14px] leading-relaxed">
                  <p className="text-ink">
                    <span className="mr-1.5 font-bold text-exploit">＋</span>
                    {info.strength}
                  </p>
                  <p className="mt-1.5 text-ink-2">
                    <span className="mr-1.5 font-bold text-ink-3">−</span>
                    {info.weakness}
                  </p>
                  <button
                    type="button"
                    onClick={() => onTry(id)}
                    className="mt-3 text-[14px] font-bold text-ink underline decoration-exploit decoration-2 underline-offset-4 hover:text-exploit"
                  >
                    この島で試す ↑
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
