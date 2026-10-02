"use client";

import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import type { IslandMode } from "@/lib/island";
import { ALGORITHM_INFO } from "@/lib/explain";
import { AlgoAvatar, KeyGlyph, Ribbon, ThermoGlyph, WeatherGlyph } from "../ui";

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

const CONTEXT_STEPS = [
  {
    title: "文脈（Context）ってなに？",
    body: "選ぶ前に分かる「手がかり」のこと。この島では天気です。動画アプリのおすすめなら、時間帯やその人の好みが文脈になります。",
  },
  {
    title: "天気を見ないと…",
    body: "記録を全部まとめるので「平均して一番」の箱に落ち着きます。でも晴れの日はソラ、雨の日はミントのほうがずっと当たる！ どんなにかしこくても越えられない壁があります（後悔グラフの青い点線）。",
  },
  {
    title: "天気を見ると…",
    body: "天気ごとに記録を分けて、天気ごとの一番を探します。天気の数だけバンディットを並べて解くイメージ。そのぶん、天気ごとに探索も必要です。",
  },
];

const LINEAR_STEPS = [
  {
    title: "状況が多すぎると…",
    body: "気温は0℃から30℃まで細かく変わります。気温ごとに記録を分けると、1つ1つの記録が少なすぎて学べません。かといって「さむい・ふつう・あつい」に区切ると、区切りの中の違いが見えなくなります。",
  },
  {
    title: "法則を学ぶ（LinUCB）",
    body: "LinUCB は「当たりやすさ ＝ 切片 ＋ 傾き × 気温」という直線を、宝箱ごとに学びます。20℃の経験が22℃の予測にも役立つので、まだあまり来ていない気温でも予測できます。",
  },
  {
    title: "自信のなさボーナス",
    body: "データが少ない気温ほど予測の自信がないので、UCB と同じようにボーナスを足して試します。「ピコの頭の中」で、線が本当の線に近づいていく様子を見てみよう。",
  },
];

export function LearnSection({ onTry, onMode }: { onTry: (id: AlgorithmId) => void; onMode: (mode: IslandMode) => void }) {
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
        <Ribbon color="var(--sky)" sub="文脈付きバンディット（Contextual Bandit）は、「状況によって一番が変わる」問題です。">
          文脈付きバンディットのひみつ
        </Ribbon>
        <div className="panel mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            {[0, 1, 2].map((c) => (
              <span key={c} className="rounded-2xl border-[3px] border-line bg-panel-2 p-1.5">
                <WeatherGlyph context={c} size={34} />
              </span>
            ))}
            <p className="f-pop text-[17px] text-ink">
              その1 天気の島：<span className="text-[14px]">はじめは、晴れはソラ・雨はミント・くもりはモモが当たりやすい</span>
            </p>
          </div>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {CONTEXT_STEPS.map((step, i) => (
              <li key={step.title} className="panel-soft px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="f-num flex h-7 w-7 items-center justify-center rounded-full border-2 border-line bg-sky text-[15px] text-white">{i + 1}</span>
                  <h3 className="f-pop text-[15px] text-ink">{step.title}</h3>
                </div>
                <p className="mt-2 text-[13.5px] leading-[1.8] font-bold text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => onMode("weather")} className="candy candy--sky px-6 py-2 text-[14px]">
              天気の島で遊ぶ ↑
            </button>
            <span className="text-[13px] font-bold text-ink-2">「天気を見て選ぶ」を切り替えて、後悔グラフの違いを見てみよう。</span>
          </div>
        </div>

        <div className="panel mt-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-2xl border-[3px] border-line bg-panel-2 p-1.5">
              <ThermoGlyph value={0.7} size={34} />
            </span>
            <span className="rounded-2xl border-[3px] border-line bg-panel-2 p-1.5">
              <AlgoAvatar id="linucb" size={34} />
            </span>
            <p className="f-pop text-[17px] text-ink">
              その2 気温の島：<span className="text-[14px]">暑いほどソラ、寒いほどミント、ほどほどならモモ</span>
            </p>
          </div>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {LINEAR_STEPS.map((step, i) => (
              <li key={step.title} className="panel-soft px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="f-num flex h-7 w-7 items-center justify-center rounded-full border-2 border-line bg-mint text-[15px] text-white">{i + 1}</span>
                  <h3 className="f-pop text-[15px] text-ink">{step.title}</h3>
                </div>
                <p className="mt-2 text-[13.5px] leading-[1.8] font-bold text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => onMode("temperature")} className="candy candy--mint px-6 py-2 text-[14px]">
              気温の島で遊ぶ ↑
            </button>
            <span className="text-[13px] font-bold text-ink-2">Thompson（3段階に区切る）と LinUCB を、VS バトルでも比べてみよう。</span>
          </div>
        </div>
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
