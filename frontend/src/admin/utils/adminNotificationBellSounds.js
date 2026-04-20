/**
 * Web Audio–based pending-notification alarm. Distinct short motifs per queue type.
 * Requires a user gesture before the AudioContext can run (handled by resumeNotifAudioContext).
 */

let sharedCtx;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

export async function resumeNotifAudioContext() {
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === "running") return true;
  if (ctx.state === "closed") return false;
  /* suspended (hidden tab / policy) or interrupted (iOS) — resume before scheduling tones */
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  return ctx.state === "running";
}

function scheduleTone(ctx, freq, startTime, durationSec, type = "sine", peak = 0.11) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  const end = startTime + durationSec;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(end + 0.04);
  return end;
}

/** Double mid C — “account desk” */
function playAccountsMotif(ctx, t0) {
  let t = t0;
  t = scheduleTone(ctx, 523.25, t, 0.1, "sine", 0.1);
  t += 0.14;
  t = scheduleTone(ctx, 523.25, t, 0.1, "sine", 0.1);
  return t + 0.06;
}

/** Ascending fifth — “movement” */
function playTransfersMotif(ctx, t0) {
  let t = t0;
  t = scheduleTone(ctx, 587.33, t, 0.08, "square", 0.07);
  t += 0.1;
  t = scheduleTone(ctx, 783.99, t, 0.1, "square", 0.08);
  return t + 0.08;
}

/** Lower sustained “cash in” */
function playDepositMotif(ctx, t0) {
  return scheduleTone(ctx, 392.0, t0, 0.32, "triangle", 0.09) + 0.06;
}

/** Low double pulse — “payout” */
function playWithdrawMotif(ctx, t0) {
  let t = t0;
  t = scheduleTone(ctx, 293.66, t, 0.12, "sine", 0.11);
  t += 0.16;
  t = scheduleTone(ctx, 277.18, t, 0.14, "sine", 0.11);
  return t + 0.06;
}

/** Time between full alarm cycles (ms); long enough for all four motifs + spacing. */
const CYCLE_INTERVAL_MS = 3600;

/**
 * Plays one alarm cycle: for each queue with count &gt; 0, plays that type’s motif in order.
 */
export function playPendingAlarmCycle(counts) {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const {
    accountsPending = 0,
    transfersPending = 0,
    depositsPending = 0,
    withdrawsPending = 0,
  } = counts || {};

  let t = ctx.currentTime + 0.02;
  const gap = 0.16;

  if (accountsPending > 0) {
    t = playAccountsMotif(ctx, t) + gap;
  }
  if (transfersPending > 0) {
    t = playTransfersMotif(ctx, t) + gap;
  }
  if (depositsPending > 0) {
    t = playDepositMotif(ctx, t) + gap;
  }
  if (withdrawsPending > 0) {
    t = playWithdrawMotif(ctx, t) + gap;
  }
}

export function getAlarmCycleIntervalMs() {
  return CYCLE_INTERVAL_MS;
}
