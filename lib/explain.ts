import type { AlgorithmId, Decision } from "./bandits/types.ts";
import { formatPercent } from "./island.ts";

export interface AlgorithmInfo {
  id: AlgorithmId;
  name: string;
  tagline: string;
  emoji: string;
  /** Beginner-friendly explanation. */
  description: string;
  analogy: string;
  strength: string;
  weakness: string;
}

export const ALGORITHM_INFO: Record<AlgorithmId, AlgorithmInfo> = {
  random: {
    id: "random",
    name: "Random",
    tagline: "いつも運まかせ",
    emoji: "🎲",
    description: "毎回サイコロを振って、どの宝箱を開けるか決めます。過去の結果はまったく使いません。",
    analogy: "レストランを毎回くじ引きで決める人。",
    strength: "比べるための基準（ベースライン）になる",
    weakness: "学習しないので、いつまでも損をし続ける",
  },
  epsilonGreedy: {
    id: "epsilonGreedy",
    name: "ε-Greedy",
    tagline: "たまに気まぐれ",
    emoji: "🪙",
    description:
      "ふだんは「今のところ一番当たりやすい箱」を選びます（活用）。ただし確率 ε（イプシロン）でランダムに箱を選び、新しい情報を集めます（探索）。",
    analogy: "いつもの店に行くけれど、10回に1回は新しい店を試す人。",
    strength: "とてもシンプルで分かりやすい",
    weakness: "探索の相手を選ばないので、明らかに悪い箱も試し続ける",
  },
  ucb1: {
    id: "ucb1",
    name: "UCB1",
    tagline: "楽観的なチャレンジャー",
    emoji: "🔭",
    description:
      "「推定当たり確率」に「まだよく分からない分のボーナス」を足したスコアで選びます。あまり試していない箱ほどボーナスが大きく、「もしかしたら良いかも」と楽観的に考えます。",
    analogy: "口コミが少ない店ほど「隠れた名店かも」と期待して行ってみる人。",
    strength: "ランダム性なしに、理論的に効率よく探索できる",
    weakness: "序盤はボーナスが大きく、探索がやや多め",
  },
  thompson: {
    id: "thompson",
    name: "Thompson Sampling",
    tagline: "想像力で決める",
    emoji: "🔮",
    description:
      "各宝箱について「本当はこれくらいの当たり確率かも」という想像（確率分布）を持ち、毎回その想像からランダムに値を1つ引いて、一番高かった箱を選びます。自信のない箱ほど想像の幅が広く、ときどき高い値が出るので自然に探索します。",
    analogy: "経験から「たぶんこの店が一番。でも、あの店も案外…」と直感で選ぶ人。",
    strength: "実験的にとても強く、探索と活用のバランスが自然",
    weakness: "仕組みを理解するには確率分布のイメージが必要",
  },
};

const pct = (v: number) => formatPercent(v);
const num = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "∞");

/** Japanese one-paragraph explanation of why the chest was chosen this turn. */
export function explainDecision(decision: Decision, names: readonly string[]): string {
  const name = `「${names[decision.arm]}」`;
  const d = decision.details;

  switch (d.kind) {
    case "random":
      return `今回はランダムに${name}を選びました。Random は過去の結果を使わず、いつもサイコロまかせです。`;

    case "epsilonGreedy": {
      if (d.explored) {
        const lucky = d.greedyArms.includes(decision.arm) && d.greedyArms.length < d.estimates.length;
        return `今回は探索！ サイコロの目（${d.roll.toFixed(2)}）が ε = ${d.epsilon.toFixed(2)} を下回ったので、ランダムに${name}を選んでみます。${
          lucky ? "（たまたま一番良さそうな箱と同じでした）" : ""
        }`;
      }
      if (d.greedyArms.length === d.estimates.length) {
        return `まだどの箱も同じくらいに見えます。「一番良さそうな箱」の候補が横並びなので、その中から${name}を選びました。`;
      }
      return `今のところ最も良さそうな${name}（推定 ${pct(d.estimates[decision.arm])}）を選びます。これまでの経験を活かす「活用」です。`;
    }

    case "ucb1": {
      if (d.initialPull) {
        return `${name}はまだ一度も開けていません。UCB1 はまず全部の宝箱を1回ずつ試してから比べます。`;
      }
      const est = pct(d.estimates[decision.arm]);
      const bonus = num(d.bonuses[decision.arm]);
      const score = num(d.scores[decision.arm]);
      if (decision.mode === "exploit") {
        return `${name}は推定値 ${est} が一番高く、ボーナス +${bonus} を足した UCB スコア ${score} も最大でした。期待値を信じて「活用」します。`;
      }
      return `${name}の推定値（${est}）は一番ではありませんが、試した回数が少ない分ボーナス（+${bonus}）が大きく、スコア ${score} が最大に。まだ十分に試していない宝箱には可能性があります。期待値と不確実性の両方を考えて選びました。`;
    }

    case "thompson": {
      const sample = pct(d.samples[decision.arm]);
      const means = d.alphas.map((a, i) => a / (a + d.betas[i]));
      if (means.every((m) => Math.abs(m - means[0]) < 1e-12)) {
        return `まだ宝箱の違いが分かりません。どの箱も「当たり確率は0〜100%のどこか」と幅広く想像し、今回は${name}（${sample}）が一番高く出たので試してみます。`;
      }
      if (decision.mode === "exploit") {
        return `それぞれの宝箱について「本当はどれくらい当たりやすいか」をランダムに想像しました。${name}は想像した値が ${sample} で最も高く、今までの成績も一番。自信を持って「活用」します。`;
      }
      return `それぞれの宝箱について「本当はどれくらい当たりやすいか」をランダムに想像し、今回は${name}（${sample}）が最も有望だと判断しました。成績トップではなくても、まだ可能性がある箱を試す「探索」です。`;
    }
  }
}
