/**
 * Lightweight Web Audio beeps — no external audio files.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.08,
  when = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Soft whoosh-ish plant cue */
export function playPlantWhoosh() {
  tone(220, 0.12, "triangle", 0.05);
  tone(330, 0.18, "sine", 0.04, 0.05);
}

/** Coin-like harvest chime */
export function playHarvestChime() {
  tone(880, 0.1, "square", 0.05);
  tone(1174, 0.14, "square", 0.045, 0.08);
  tone(1568, 0.18, "sine", 0.04, 0.16);
}

/** Alert / celebration for Golden Harvest */
export function playGoldenChime() {
  tone(523.25, 0.12, "sine", 0.06);
  tone(659.25, 0.12, "sine", 0.06, 0.1);
  tone(783.99, 0.12, "sine", 0.06, 0.2);
  tone(1046.5, 0.28, "triangle", 0.07, 0.32);
}
