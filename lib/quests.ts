import type { AlgorithmId } from "./bandits/types.ts";
import type { IslandMode } from "./island.ts";

/** What a quest can look at: the current settings and run, summarised. */
export interface QuestSnapshot {
  mode: IslandMode;
  algorithm: AlgorithmId;
  epsilon: number;
  aware: boolean;
  /** Turns in the current run. */
  turn: number;
  cumulativeRegret: number;
  /** Expected regret per turn of Random on this island. */
  randomRegretRate: number;
  /** Share of the last 100 turns spent on the truly best chest (null before any turn). */
  recentOptimalRate: number | null;
  /** The algorithm used for every one of the last 100 turns (null if mixed / none). */
  recentAlgorithm: AlgorithmId | null;
  /** Context awareness for every one of the last 100 turns (null if mixed / none). */
  recentAware: boolean | null;
  /** The algorithm used for every turn of the current run (null if mixed / none). */
  runAlgorithm: AlgorithmId | null;
  /** VS battles fought this session. */
  battles: number;
}

export type QuestSticker =
  | { kind: "algo"; id: AlgorithmId }
  | { kind: "chest" }
  | { kind: "weather"; context: number }
  | { kind: "thermo" }
  | { kind: "vs" };

export interface QuestSetup {
  mode: IslandMode;
  algorithm?: AlgorithmId;
  epsilon?: number;
  aware?: boolean;
  /** Start from a fresh run (default true). */
  reset?: boolean;
}

export interface Quest {
  id: string;
  chapter: number;
  title: string;
  /** Pico's briefing, shown in the speech bubble when the quest starts. */
  briefing: string;
  /** One-line goal shown on the quest bar. */
  goal: string;
  hint: string;
  /** What the quest switches to when it starts (null = leave settings alone). */
  setup: QuestSetup | null;
  /**
   * Counting quests: turns played while `counts` holds, up to `target`.
   * Checking quests: `check` must hold.
   */
  counts?: (s: QuestSnapshot) => boolean;
  target?: number;
  check?: (s: QuestSnapshot) => boolean;
  /** Progress 0–1 and a short label, for checking quests. */
  meter?: (s: QuestSnapshot) => { value: number; label: string };
  /** "わかったこと" shown when cleared. */
  lesson: string;
  sticker: QuestSticker;
}

export const CHAPTERS = [
  { id: 1, title: "ふつうの島", sub: "探索と活用のきほん", color: "var(--sky)" },
  { id: 2, title: "天気の島", sub: "文脈付きバンディット", color: "var(--grape)" },
  { id: 3, title: "気温の島", sub: "法則を学ぶ LinUCB", color: "var(--mint)" },
];

const pct = (v: number | null) => `${Math.round((v ?? 0) * 100)}%`;

/** Progress meter for "reach X% recent hit rate" quests. */
const rateMeter = (goal: number, minTurns: number) => (s: QuestSnapshot) =>
  s.turn < minTurns
    ? { value: (s.turn / minTurns) * 0.5, label: `まずは ${s.turn} / ${minTurns} ターン` }
    : { value: Math.min(1, (s.recentOptimalRate ?? 0) / goal), label: `直近100の正解率 ${pct(s.recentOptimalRate)} → 目標 ${pct(goal)}` };

export const QUESTS: Quest[] = [
  {
    id: "first-steps",
    chapter: 1,
    title: "はじめての冒険",
    briefing: "クエスト開始！ まずは宝箱を10回開けてみよう。開けるたびに、ぼくの見積もりと紫のもやがどう変わるか見ててね。",
    goal: "宝箱を10回開ける",
    hint: "大きなスタートボタンか「1歩」を押そう。",
    setup: { mode: "classic", algorithm: "thompson" },
    counts: (s) => s.mode === "classic",
    target: 10,
    lesson: "マルチアームド・バンディットは「試しながら一番を探す」問題。開けるほど見積もり（大きな数字）がはっきりして、もやが晴れていきました。",
    sticker: { kind: "chest" },
  },
  {
    id: "random-baseline",
    chapter: 1,
    title: "サイコロまかせ",
    briefing: "今日はサイコロのRandomくんが探検するよ。100ターン遊んで、「冒険のきろく」の後悔のグラフを見てみよう。",
    goal: "Random で100ターン遊ぶ",
    hint: "速度を 20x や 100x にすると早いよ。",
    setup: { mode: "classic", algorithm: "random" },
    counts: (s) => s.mode === "classic" && s.algorithm === "random",
    target: 100,
    lesson: "Random は学ばないので、後悔のグラフはまっすぐ伸び続けます。これが「何も学ばない」ときの基準。ほかの探検家はこの線より下に行けるかな？",
    sticker: { kind: "algo", id: "random" },
  },
  {
    id: "greedy-trap",
    chapter: 1,
    title: "よくばりの落とし穴",
    briefing: "ε-Greedy の ε を 0 にしたよ。つまり探索はゼロ、いつも「今のところ一番」だけを選ぶ。200ターンでどうなるかな？",
    goal: "ε = 0 の ε-Greedy で200ターン遊ぶ",
    hint: "「宝箱ステータス」の「こたえを見る」で、本当に一番の箱を選べているか確かめてみよう。",
    setup: { mode: "classic", algorithm: "epsilonGreedy", epsilon: 0 },
    counts: (s) => s.mode === "classic" && s.algorithm === "epsilonGreedy" && s.epsilon === 0,
    target: 200,
    lesson: "探索をしないと、最初に当たった箱にこだわってしまうことがあります。本当の一番を見逃したかも。ε を少し上げると、たまに寄り道して見つけ直せます。",
    sticker: { kind: "algo", id: "epsilonGreedy" },
  },
  {
    id: "optimist",
    chapter: 1,
    title: "楽観的なチャレンジャー",
    briefing: "UCB1 は「よく分からない箱には可能性がある」と考えるんだ。直近100ターンで、本当に一番の箱を80%以上選べるようになろう！",
    goal: "UCB1 で直近100ターンの正解率 80% 以上",
    hint: "時間がかかるので「1,000ターン先へ」を使ってもOK。途中でキャラを変えるとやり直しだよ。",
    setup: { mode: "classic", algorithm: "ucb1" },
    check: (s) => s.mode === "classic" && s.turn >= 100 && s.recentAlgorithm === "ucb1" && (s.recentOptimalRate ?? 0) >= 0.8,
    meter: rateMeter(0.8, 100),
    lesson: "UCB1 はあまり試していない箱にボーナスをあげて、自然に探索してから一番に集中します。ランダムに頼らない探索の方法です。",
    sticker: { kind: "algo", id: "ucb1" },
  },
  {
    id: "imagination",
    chapter: 1,
    title: "想像力の勝利",
    briefing: "Thompson Sampling の出番！ 300ターン以上遊んで、累積後悔を Random の半分以下におさえよう。",
    goal: "Thompson で累積後悔を Random の半分以下に（300ターン以上）",
    hint: "最初から最後まで Thompson で遊ぼう。Random の後悔は1ターンあたり約0.3だよ。",
    setup: { mode: "classic", algorithm: "thompson" },
    check: (s) => s.mode === "classic" && s.turn >= 300 && s.runAlgorithm === "thompson" && s.cumulativeRegret <= 0.5 * s.turn * s.randomRegretRate,
    meter: (s) =>
      s.turn < 300
        ? { value: (s.turn / 300) * 0.6, label: `${s.turn} / 300 ターン` }
        : {
            value: s.cumulativeRegret <= 0.5 * s.turn * s.randomRegretRate ? 1 : 0.8,
            label: `後悔 ${s.cumulativeRegret.toFixed(1)}（Random なら約 ${(s.turn * s.randomRegretRate).toFixed(0)}）`,
          },
    lesson: "Thompson は「本当はこれくらいかも」と想像して選ぶので、自信のない箱をほどよく試し、すぐ一番に集中します。後悔の線がすぐ寝ていきましたね。",
    sticker: { kind: "algo", id: "thompson" },
  },
  {
    id: "first-battle",
    chapter: 1,
    title: "はじめてのVSバトル",
    briefing: "1回の冒険は運に左右されるんだ。ページの下の「VSバトル」で、2人を100回ずつ戦わせてみよう！",
    goal: "VSバトルを1回やる",
    hint: "ページの一番下にある「バトル開始！」を押そう。",
    setup: null,
    check: (s) => s.battles >= 1,
    lesson: "アルゴリズムの強さは、何度も試した平均でくらべるのが大切。1回だけだと、たまたま運がよかっただけかもしれません。",
    sticker: { kind: "vs" },
  },
  {
    id: "weather-blind",
    chapter: 2,
    title: "天気を見ないと…",
    briefing: "天気の島へようこそ！ まずは天気を見ないで300ターン遊んでみるね。後悔のグラフの青い点線に注目！",
    goal: "天気を見ないで300ターン遊ぶ",
    hint: "「天気を見て選ぶ」はオフのままで。",
    setup: { mode: "weather", algorithm: "thompson", aware: false },
    counts: (s) => s.mode === "weather" && !s.aware,
    target: 300,
    lesson: "どんなにかしこくても、天気を見ないと「平均して一番」の箱止まり。後悔は「天気を見ない限界」の線に沿って伸び続けます。",
    sticker: { kind: "weather", context: 2 },
  },
  {
    id: "weather-aware",
    chapter: 2,
    title: "天気を読む",
    briefing: "今度は天気を見て選ぶよ。晴れ・雨・くもり、それぞれの一番を見つけて、直近100ターンの正解率80%を目指そう！",
    goal: "天気を見て、直近100ターンの正解率 80% 以上",
    hint: "「冒険のきろく」の天気ごとの帯が、それぞれ1色にそろっていくよ。",
    setup: { mode: "weather", algorithm: "thompson", aware: true },
    check: (s) => s.mode === "weather" && s.turn >= 100 && s.recentAware === true && (s.recentOptimalRate ?? 0) >= 0.8,
    meter: rateMeter(0.8, 100),
    lesson: "文脈（天気）を見ると、天気ごとの一番を学べます。これが文脈付きバンディット。おすすめアプリが時間帯や好みで内容を変えるのと同じ考え方です。",
    sticker: { kind: "weather", context: 0 },
  },
  {
    id: "temperature-bands",
    chapter: 3,
    title: "区切りの限界",
    briefing: "気温の島だよ。Thompson で、気温を「さむい・ふつう・あつい」に区切って500ターン学んでみるね。",
    goal: "気温を3段階に区切って500ターン遊ぶ",
    hint: "「ピコの頭の中」の見積もりが階段の形になっているのを見てみよう。",
    setup: { mode: "temperature", algorithm: "thompson", aware: true },
    counts: (s) => s.mode === "temperature" && s.aware && s.algorithm !== "linucb",
    target: 500,
    lesson: "区切って数えると、「ふつう」の中で一番の箱が入れ替わるのを見分けられません。後悔のグラフに、越えられない限界（緑の点線）が残ります。",
    sticker: { kind: "thermo" },
  },
  {
    id: "linear-rule",
    chapter: 3,
    title: "法則を見つけろ",
    briefing: "最後の挑戦！ LinUCB で、気温と当たりやすさの法則を学ぼう。直近100ターンの正解率85%を目指してね。",
    goal: "LinUCB で直近100ターンの正解率 85% 以上",
    hint: "「ピコの頭の中」で「本当の線を見る」をオンにすると、ピコの線が近づいていくのが分かるよ。",
    setup: { mode: "temperature", algorithm: "linucb", aware: true },
    check: (s) => s.mode === "temperature" && s.turn >= 100 && s.recentAlgorithm === "linucb" && s.recentAware === true && (s.recentOptimalRate ?? 0) >= 0.85,
    meter: rateMeter(0.85, 100),
    lesson: "LinUCB は「気温が高いほど当たる」のような法則を学ぶので、似た状況の経験を使い回せます。状況の種類がたくさんあっても速く学べるのが強みです。",
    sticker: { kind: "algo", id: "linucb" },
  },
];

export const questById = (id: string | null) => QUESTS.find((q) => q.id === id) ?? null;

/** Quests unlock in order: each one needs the previous to be cleared. */
export function isUnlocked(index: number, cleared: ReadonlySet<string>): boolean {
  return index === 0 || cleared.has(QUESTS[index - 1].id);
}

/** Progress 0–1 plus a label for the quest bar. */
export function questProgress(quest: Quest, s: QuestSnapshot, count: number): { value: number; label: string } {
  if (quest.target !== undefined) {
    const done = Math.min(count, quest.target);
    return { value: done / quest.target, label: `${done.toLocaleString()} / ${quest.target.toLocaleString()} ターン` };
  }
  if (quest.meter) return quest.meter(s);
  return { value: quest.check?.(s) ? 1 : 0, label: quest.check?.(s) ? "達成！" : "まだ" };
}

export function isQuestDone(quest: Quest, s: QuestSnapshot, count: number): boolean {
  if (quest.target !== undefined) return count >= quest.target;
  return quest.check?.(s) ?? false;
}
