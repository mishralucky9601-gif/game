// Minimal synthesized sound effects using the WebAudio API - no external
// audio files required, so the game works instantly with zero asset loading.
// Swap the tone() calls for <audio> playback if you want real recorded SFX/music.

type SoundKey =
  | "move"
  | "capture"
  | "card"
  | "dice"
  | "explosion"
  | "victory"
  | "defeat"
  | "start";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AudioCtx();
  }
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15, delay = 0) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audioCtx.destination);
  const startTime = audioCtx.currentTime + delay;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playSound(key: SoundKey) {
  try {
    switch (key) {
      case "move":
        tone(440, 0.08, "triangle", 0.1);
        break;
      case "capture":
        tone(220, 0.12, "sawtooth", 0.15);
        tone(160, 0.15, "sawtooth", 0.1, 0.05);
        break;
      case "card":
        tone(600, 0.1, "square", 0.08);
        tone(800, 0.08, "square", 0.06, 0.06);
        break;
      case "dice":
        tone(300, 0.05, "square", 0.08);
        tone(340, 0.05, "square", 0.08, 0.06);
        tone(380, 0.08, "square", 0.08, 0.12);
        break;
      case "explosion":
        tone(90, 0.3, "sawtooth", 0.2);
        tone(60, 0.4, "sawtooth", 0.18, 0.05);
        break;
      case "victory":
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.12));
        break;
      case "defeat":
        [400, 340, 280].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.12, i * 0.15));
        break;
      case "start":
        tone(523, 0.15, "triangle", 0.1);
        tone(784, 0.2, "triangle", 0.1, 0.15);
        break;
    }
  } catch {
    // AudioContext may be blocked until a user gesture - fail silently.
  }
}
