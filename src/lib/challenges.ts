// src/lib/challenges.ts

import {
  Crosshair, ArrowLeft, ArrowRight, Hand, ZoomIn,
} from "lucide-react";
import type { ChallengeConfig, LivenessChallenge } from "../types/kyc";

// Yaw value (0-1 normalised) the user must reach to pass a head-turn challenge.
// Shared between the detection logic and the UI progress bar so they stay in sync.
export const TURN_YAW_TARGET = 0.18;

export const CHALLENGE_CONFIGS: Record<LivenessChallenge, ChallengeConfig> = {
  center: {
    id: "center",
    label: "challenge_center_label",
    instruction: "challenge_center_instruction",
    icon: Crosshair,
    requiresHand: false,
    requiresPose: false,
  },
  lookLeft: {
    id: "lookLeft",
    label: "challenge_lookLeft_label",
    instruction: "challenge_lookLeft_instruction",
    icon: ArrowLeft,
    requiresHand: false,
    requiresPose: false,
  },
  lookRight: {
    id: "lookRight",
    label: "challenge_lookRight_label",
    instruction: "challenge_lookRight_instruction",
    icon: ArrowRight,
    requiresHand: false,
    requiresPose: false,
  },
  raiseLeftHand: {
    id: "raiseLeftHand",
    label: "challenge_raiseLeftHand_label",
    instruction: "challenge_raiseLeftHand_instruction",
    icon: Hand,
    requiresHand: false,
    requiresPose: true,
  },
  raiseRightHand: {
    id: "raiseRightHand",
    label: "challenge_raiseRightHand_label",
    instruction: "challenge_raiseRightHand_instruction",
    icon: Hand,
    requiresHand: false,
    requiresPose: true,
  },
  // nodHead: {
  //   id: "nodHead",
  //   label: "challenge_nodHead_label",
  //   instruction: "challenge_nodHead_instruction",
  //   icon: ArrowUpDown,
  //   requiresHand: false,
  //   requiresPose: true,
  // },
  moveCloser: {
    id: "moveCloser",
    label: "challenge_moveCloser_label",
    instruction: "challenge_moveCloser_instruction",
    icon: ZoomIn,
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
  const pool: LivenessChallenge[] = ["lookLeft", "lookRight", "moveCloser", "raiseLeftHand", "raiseRightHand"];
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