/**
 * Plays a short two-tone success beep using the Web Audio API.
 * Fails silently if the API is unavailable or the user's browser blocks it.
 */
export function playSuccessBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    // Rising two-tone: 880 Hz → 1100 Hz gives a "ding-ding" feel
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);

    osc.onended = () => void ctx.close();
  } catch {
    // Web Audio not available or blocked — silent fallback
  }
}
