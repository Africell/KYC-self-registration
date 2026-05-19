// src/lib/challenges.ts

import type { ChallengeConfig, LivenessChallenge } from "../types/kyc";

// Yaw value (0-1 normalised) the user must reach to pass a head-turn challenge.
// Shared between the detection logic and the UI progress bar so they stay in sync.
export const TURN_YAW_TARGET = 0.18;

export const CHALLENGE_CONFIGS: Record<LivenessChallenge, ChallengeConfig> = {
  center: {
    id: "center",
    label: "Face Forward",
    instruction: "Look directly at the camera.",
    icon: "🎯",
    requiresHand: false,
    requiresPose: false,
  },
  lookLeft: {
    id: "lookLeft",
    label: "Look Left",
    instruction: "Slowly turn your head to your left.",
    icon: "👈",
    requiresHand: false,
    requiresPose: false,
  },
  lookRight: {
    id: "lookRight",
    label: "Look Right",
    instruction: "Slowly turn your head to your right.",
    icon: "👉",
    requiresHand: false,
    requiresPose: false,
  },
  raiseLeftHand: {
    id: "raiseLeftHand",
    label: "Raise Left Hand",
    instruction: "Raise your left hand above your shoulder.",
    icon: "🤚",
    requiresHand: false,
    requiresPose: true,
  },
  raiseRightHand: {
    id: "raiseRightHand",
    label: "Raise Right Hand",
    instruction: "Raise your right hand above your shoulder.",
    icon: "✋",
    requiresHand: false,
    requiresPose: true,
  },
  nodHead: {
    id: "nodHead",
    label: "Nod Your Head",
    instruction: "Nod your head up and down slowly.",
    icon: "🙆",
    requiresHand: false,
    requiresPose: true,
  },
  moveCloser: {
    id: "moveCloser",
    label: "Move Closer",
    instruction: "Move your face closer to the camera.",
    icon: "🔍",
    requiresHand: false,
    requiresPose: false,
  },
 
};

/**
 * "center" is always first.
 * Remaining challenges are drawn from a reliable pool that only uses face-api.js
 * (no extra MediaPipe models required — avoids CDN failures and load delays).
 *
 * If previousSequence is supplied the function retries until it produces a
 * sequence with a different order so the user never sees the exact same
 * challenge run twice in a row.
 */
export function buildChallengeSequence(
  count = 3,
  previousSequence?: LivenessChallenge[],
): LivenessChallenge[] {
  const pool: LivenessChallenge[] = ["lookLeft", "lookRight", "moveCloser"];
  const needed = Math.max(1, count - 1);

  let picked: LivenessChallenge[];
  let attempts = 0;

  do {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    picked = shuffled.slice(0, needed);
    attempts++;
  } while (
    attempts < 20 &&
    previousSequence &&
    previousSequence.length > 1 &&
    JSON.stringify(["center", ...picked]) === JSON.stringify(previousSequence)
  );

  return ["center", ...picked];
}