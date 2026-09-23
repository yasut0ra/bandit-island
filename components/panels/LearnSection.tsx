"use client";

import { ALGORITHM_IDS, type AlgorithmId } from "@/lib/bandits/index.ts";
import { ALGORITHM_INFO } from "@/lib/explain";
import { Card } from "../ui";

const BASICS = [
  {
    icon: "🎰",
    title: "マルチアームド・バンディットとは？",
    en: "Multi-Armed Bandit",
    body: "どの選択肢が一番良いか分からない状態で、試しながら最良の選択肢を見つける問題です。名前の由来は、腕（アーム）がたくさんあるスロットマシン。この島では5つの宝箱が「腕」です。",
    tone: "from-sky-400/20 to-cyan-400/10",
  },
  {
    icon: "🔍",
    title: "探索とは？",
    en: "Exploration",
    body: "まだよく分からない選択肢を試して、新しい情報を集めること。すぐには得をしないかもしれませんが、「実はもっと良い箱があった！」を見つけるために必要です。",
    tone: "from-violet-400/25 to-fuchsia-400/10",
  },
  {
    icon: "💰",
    title: "活用とは？",
    en: "Exploitation",
    body: "今までの結果から、一番良さそうな選択肢を選ぶこと。確実に稼げますが、活用ばかりだと、もっと良い箱の存在に気づけないかもしれません。",
    tone: "from-amber-400/25 to-orange-400/10",
  },
  {
    icon: "😣",
    title: "累積後悔とは？",
    en: "Cumulative Regret",
    body: "「最初から一番良い箱だけを選んでいれば得られたはずの報酬」との差の合計。探索にかかったコストです。良いアルゴリズムほど、後悔の増え方がすぐに緩やかになります。",
    tone: "from-rose-400/20 to-pink-400/10",
  },
];

const LEGEND = [
  { icon: "🌫️", title: "紫の霧", body: "まだよく分からない箱（不確実性が高い）。試すほど晴れていきます。" },
  { icon: "👣", title: "道と足跡", body: "よく選ばれている箱ほど、道がくっきり、足跡が増えます。" },
  { icon: "🪙", title: "コインの山", body: "その箱で当たった回数。多いほど高く積み上がります。" },
  { icon: "⭐", title: "回る星と 👑", body: "ロボットが「今一番良い」と推定している箱。" },
  { icon: "💡", title: "アンテナの色", body: "紫なら探索中、オレンジなら活用中。" },
];

export function LearnSection({ onTry }: { onTry: (id: AlgorithmId) => void }) {
  return (
    <section id="learn" className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">はじめてのバンディット</h2>
        <p className="mt-1 text-sm text-muted">数学を知らなくても大丈夫。3つの言葉だけ覚えれば、島で起きていることが分かります。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BASICS.map((b) => (
          <div key={b.title} className={`rounded-3xl border border-line/80 bg-linear-to-br ${b.tone} p-5`}>
            <div className="text-3xl" aria-hidden>
              {b.icon}
            </div>
            <h3 className="mt-2 text-base font-bold text-ink">{b.title}</h3>
            <div className="font-display text-xs text-muted">{b.en}</div>
            <p className="mt-2 text-sm leading-relaxed text-ink/85">{b.body}</p>
          </div>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-bold">🗺️ 島の見かた</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEGEND.map((l) => (
            <div key={l.title} className="flex gap-2.5">
              <span className="text-2xl" aria-hidden>
                {l.icon}
              </span>
              <div>
                <div className="text-sm font-bold">{l.title}</div>
                <p className="text-xs leading-relaxed text-muted">{l.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="font-display text-xl font-semibold text-ink">4つのアルゴリズム</h3>
        <p className="mt-1 text-sm text-muted">同じ島でも、アルゴリズムによって「探索」と「活用」のバランスの取り方が違います。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ALGORITHM_IDS.map((id) => {
          const info = ALGORITHM_INFO[id];
          return (
            <Card key={id} className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {info.emoji}
                </span>
                <div>
                  <div className="font-display text-lg font-semibold">{info.name}</div>
                  <div className="text-xs text-muted">{info.tagline}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onTry(id)}
                  className="ml-auto rounded-full bg-explore px-3 py-1.5 text-xs font-bold text-white shadow transition-transform hover:-translate-y-0.5"
                >
                  この島で試す ↑
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{info.description}</p>
              <p className="mt-2 rounded-2xl bg-panel-soft px-3 py-2 text-xs leading-relaxed text-muted">
                <span className="font-bold text-ink">たとえるなら：</span>
                {info.analogy}
              </p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-500/10 px-3 py-2">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">👍 得意</div>
                  <div className="mt-0.5 text-ink/80">{info.strength}</div>
                </div>
                <div className="rounded-2xl bg-rose-500/10 px-3 py-2">
                  <div className="font-bold text-rose-700 dark:text-rose-300">👎 苦手</div>
                  <div className="mt-0.5 text-ink/80">{info.weakness}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
