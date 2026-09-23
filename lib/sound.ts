/** Tiny WebAudio synth for reward / miss jingles (no audio files needed). */
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** Call from a user gesture so browsers allow audio later. */
export function unlockAudio() {
  getContext();
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playReward(big = true) {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = big ? [784, 988, 1175, 1568] : [988, 1319];
  notes.forEach((f, i) => tone(ctx, f, t + i * 0.065, 0.22, "triangle", 0.09));
  if (big) tone(ctx, 2093, t + 0.3, 0.35, "sine", 0.04);
}

export function playMiss() {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}
