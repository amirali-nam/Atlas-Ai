/** Tiny synthesized UI sounds (Web Audio) — no asset files, pure HUD feel. */
let ctx: AudioContext | null = null;

function beep(freq: number, dur: number, type: OscillatorType = "square", gain = 0.025) {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    /* audio not available — silent fallback */
  }
}

/** Sharp double-blip when a directive is transmitted. */
export function sfxSend() {
  beep(1250, 0.06);
  setTimeout(() => beep(1650, 0.07), 70);
}

/** Softer confirmation tone when ATLAS finishes responding. */
export function sfxReply() {
  beep(660, 0.08, "sine", 0.03);
  setTimeout(() => beep(880, 0.1, "sine", 0.03), 90);
}
