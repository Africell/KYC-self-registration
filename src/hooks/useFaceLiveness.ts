// src/hooks/useFaceLiveness.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";

import type { LandmarkStatus, LivenessChallenge } from "../types/kyc";
import {
  computeFaceQuality,
  computeYawFromLandmarks,
  computeFaceSizeRatio,
} from "../lib/services/face.service";
import { waitForVideoReady } from "../lib/services/video.service";
import { playSuccessBeep } from "../utils/audio";
import { buildChallengeSequence, CHALLENGE_CONFIGS, TURN_YAW_TARGET } from "../lib/challenges";
import {
  areGestureModelsLoaded,
  computePitchFromPose,
  detectGestures,
  isRaisingLeftHand,
  isRaisingRightHand,
} from "../lib/services/gesture.service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LivenessPhase =
  | "detecting"
  | "ready"
  | "challenging"
  | "timeout"
  | "done";

type UseFaceLivenessProps = {
  webcamRef: React.RefObject<Webcam | null>;
  modelsLoaded: boolean;
  active: boolean;
  challengeCount?: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CHALLENGE_TIMEOUT_MS  = 8_000;
const DETECTION_INTERVAL_MS = 350;
const PASS_STREAK_REQUIRED  = 2;

const NOD_WINDOW          = 5;
const NOD_PITCH_THRESHOLD = 0.028;

const CLOSER_DELTA     = 0.08;
const CLOSER_MIN_RATIO = 0.28;

// > 1 allows face corners slightly outside the mathematical oval edge
const OVAL_THRESHOLD = 1.15;

const INITIAL_LANDMARK_STATUS: LandmarkStatus = {
  faceDetected: false,
  yawEstimate:  0,
  qualityOk:    false,
  hint:         "Center your face inside the frame.",
  faceBox:      null,
};

const POSE_CHALLENGES = new Set<LivenessChallenge>([
  "raiseLeftHand",
  "raiseRightHand",
  "nodHead",
]);

// Defined once at module level — avoids allocating option objects on every tick
const TINY_OPTIONS_FAST = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.35,
});

const TINY_OPTIONS_DETECT = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.4,
});

const TINY_OPTIONS_CHALLENGE = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.3,
});

// ── Pure module-level helpers ─────────────────────────────────────────────────
// Extracted from the hook body so they are not re-created on every render.

function roundYaw(yaw: number): number {
  return Math.round(yaw * 10000) / 10000;
}

function isFaceInOval(
  box: faceapi.Box,
  vw: number,
  vh: number,
): boolean {
  if (!vw || !vh) return false;
  const cx = 0.50 * vw, cy = 0.48 * vh;
  const rx = 0.22 * vw, ry = 0.31 * vh;
  const faceCX = box.x + box.width  / 2;
  const faceCY = box.y + box.height / 2;
  const pts: [number, number][] = [
    [faceCX,             box.y],
    [faceCX,             box.y + box.height],
    [box.x,              faceCY],
    [box.x + box.width,  faceCY],
    [faceCX,             faceCY],
  ];
  for (const [px, py] of pts) {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    if (dx * dx + dy * dy > OVAL_THRESHOLD) return false;
  }
  return true;
}

// Mutates buf in place (ring buffer). Returns true when a full nod gesture
// (sufficient range + direction reversal) is detected within the window.
function detectNodFromWindow(buf: number[], pitch: number): boolean {
  buf.push(pitch);
  if (buf.length > NOD_WINDOW) buf.shift();
  if (buf.length < NOD_WINDOW) return false;

  const min = Math.min(...buf);
  const max = Math.max(...buf);
  if (max - min <= NOD_PITCH_THRESHOLD) return false;

  const mid  = Math.floor(buf.length / 2);
  const fh   = buf.slice(0, mid);
  const sh   = buf.slice(mid);
  const fMax = Math.max(...fh), fMin = Math.min(...fh);
  const sMax = Math.max(...sh), sMin = Math.min(...sh);

  // Down-then-up: first half peaks high, second half dips low
  // Up-then-down: first half dips low, second half peaks high
  return (fMax > sMax && fMin > sMin) || (fMin < sMin && fMax < sMax);
}

// Returns true only when the new status is meaningfully different from prev.
// Yaw uses a 0.005 dead-band to suppress float-noise re-renders.
// faceBox uses a 2 px tolerance for the same reason.
function landmarkStatusChanged(
  prev: LandmarkStatus,
  next: LandmarkStatus,
): boolean {
  if (prev.faceDetected !== next.faceDetected) return true;
  if (prev.qualityOk    !== next.qualityOk)    return true;
  if (prev.hint         !== next.hint)         return true;
  if (Math.abs(prev.yawEstimate - next.yawEstimate) > 0.005) return true;
  const pb = prev.faceBox, nb = next.faceBox;
  if ((pb === null) !== (nb === null)) return true;
  if (pb && nb) {
    if (Math.abs(pb.x      - nb.x)      > 2) return true;
    if (Math.abs(pb.y      - nb.y)      > 2) return true;
    if (Math.abs(pb.width  - nb.width)  > 2) return true;
    if (Math.abs(pb.height - nb.height) > 2) return true;
  }
  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFaceLiveness({
  webcamRef,
  modelsLoaded,
  active,
  challengeCount = 3,
}: UseFaceLivenessProps) {
  const intervalRef           = useRef<number | null>(null);
  const challengeTimerRef     = useRef<number | null>(null);
  const pitchWindow           = useRef<number[]>([]);
  const passStreakRef         = useRef(0);
  const moveCloserBaselineRef = useRef<number | null>(null);
  // Guards against overlapping async detections: if the previous tick's
  // TF.js call hasn't returned yet, skip the new tick entirely. This
  // prevents GPU contention and eliminates challenge-advance race conditions.
  const isProcessingRef       = useRef(false);

  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhaseState] = useState<LivenessPhase>("detecting");
  const phaseRef = useRef<LivenessPhase>("detecting");

  const setPhase = useCallback((next: LivenessPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  // ── Challenges ─────────────────────────────────────────────────────────────
  const [challengeSequence, setChallengeSequence] = useState<LivenessChallenge[]>(
    () => buildChallengeSequence(challengeCount),
  );
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [completedSet,   setCompletedSet]   = useState<Set<LivenessChallenge>>(new Set());

  const challengeSequenceRef = useRef(challengeSequence);
  const challengeIndexRef    = useRef(challengeIndex);

  // Safety-net syncs: covers any path that sets state without also updating
  // the ref directly (e.g. external re-renders from parent state changes).
  useEffect(() => { challengeSequenceRef.current = challengeSequence; }, [challengeSequence]);
  useEffect(() => { challengeIndexRef.current    = challengeIndex;    }, [challengeIndex]);

  // ── Challenge timer countdown ──────────────────────────────────────────────
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(
    CHALLENGE_TIMEOUT_MS / 1000,
  );

  // ── Landmark status ────────────────────────────────────────────────────────
  const [landmarkStatus, setLandmarkStatus] = useState<LandmarkStatus>(
    INITIAL_LANDMARK_STATUS,
  );
  // Tracks the last value passed to setLandmarkStatus so that detection
  // callbacks can spread it (preserving fields they don't compute, e.g. yaw
  // during the detecting phase) and skip the state update when nothing changed.
  const prevLandmarkRef = useRef<LandmarkStatus>(INITIAL_LANDMARK_STATUS);

  const updateLandmarkStatus = useCallback((next: LandmarkStatus) => {
    if (landmarkStatusChanged(prevLandmarkRef.current, next)) {
      prevLandmarkRef.current = next;
      setLandmarkStatus(next);
    }
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const livenessChallenge: LivenessChallenge =
    challengeSequence[challengeIndex] ??
    challengeSequence[challengeSequence.length - 1];

  const livenessDone = phase === "done";

  const livenessCompleted = useMemo(
    () =>
      Object.fromEntries(
        challengeSequence.map((id) => [id, completedSet.has(id)]),
      ) as Record<LivenessChallenge, boolean>,
    [challengeSequence, completedSet],
  );

  // ── Timer helpers ──────────────────────────────────────────────────────────
  const clearChallengeTimer = useCallback(() => {
    if (challengeTimerRef.current) {
      window.clearInterval(challengeTimerRef.current);
      challengeTimerRef.current = null;
    }
  }, []);

  // ── Shared reset ──────────────────────────────────────────────────────────
  const applyReset = useCallback(
    (freshSequence: LivenessChallenge[]) => {
      clearChallengeTimer();
      pitchWindow.current         = [];
      passStreakRef.current        = 0;
      moveCloserBaselineRef.current = null;

      setChallengeSequence(freshSequence);
      challengeSequenceRef.current = freshSequence;
      setChallengeIndex(0);
      challengeIndexRef.current    = 0;
      setCompletedSet(new Set());
      setChallengeTimeLeft(CHALLENGE_TIMEOUT_MS / 1000);

      // Force-reset landmark status and sync the change-guard ref
      prevLandmarkRef.current = INITIAL_LANDMARK_STATUS;
      setLandmarkStatus(INITIAL_LANDMARK_STATUS);
      setPhase("detecting");
    },
    [clearChallengeTimer, setPhase],
  );

  // ── Per-challenge countdown ────────────────────────────────────────────────
  const startChallengeTimer = useCallback(
    (forIndex: number) => {
      clearChallengeTimer();
      let remaining = CHALLENGE_TIMEOUT_MS / 1000;
      setChallengeTimeLeft(remaining);

      challengeTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        setChallengeTimeLeft(remaining);
        if (remaining <= 0) {
          const challenge = challengeSequenceRef.current[forIndex];
          advanceChallengeRef.current(false, forIndex, challenge);
        }
      }, 1000);
    },
    [clearChallengeTimer],
  );

  // ── Advance to next challenge ──────────────────────────────────────────────
  const advanceChallenge = useCallback(
    (
      passed: boolean,
      currentIndex: number,
      currentChallenge: LivenessChallenge,
    ) => {
      clearChallengeTimer();
      pitchWindow.current          = [];
      passStreakRef.current         = 0;
      moveCloserBaselineRef.current = null;

      if (!passed) {
        setPhase("timeout");
        return;
      }

      setCompletedSet((prev) => {
        const next = new Set(prev);
        next.add(currentChallenge);
        return next;
      });

      const seq       = challengeSequenceRef.current;
      const nextIndex = currentIndex + 1;

      if (nextIndex >= seq.length) {
        // Sync ref immediately — don't wait for the useEffect safety-net
        challengeIndexRef.current = seq.length - 1;
        setChallengeIndex(seq.length - 1);
        // Reset yaw so the side-capture phase starts from a clean baseline
        const withZeroYaw = { ...prevLandmarkRef.current, yawEstimate: 0 };
        prevLandmarkRef.current = withZeroYaw;
        setLandmarkStatus(withZeroYaw);
        setPhase("done");
      } else {
        // Sync ref immediately to eliminate the race window between
        // setChallengeIndex and the useEffect that mirrors it to the ref.
        challengeIndexRef.current = nextIndex;
        setChallengeIndex(nextIndex);
        setChallengeTimeLeft(CHALLENGE_TIMEOUT_MS / 1000);
        startChallengeTimer(nextIndex);
      }
    },
    [clearChallengeTimer, startChallengeTimer, setPhase],
  );

  const advanceChallengeRef = useRef(advanceChallenge);
  useEffect(() => {
    advanceChallengeRef.current = advanceChallenge;
  }, [advanceChallenge]);

  // ── Start challenges ───────────────────────────────────────────────────────
  const startChallenges = useCallback(() => {
    setChallengeIndex(0);
    challengeIndexRef.current = 0;
    setCompletedSet(new Set());
    setChallengeTimeLeft(CHALLENGE_TIMEOUT_MS / 1000);
    setPhase("challenging");
    startChallengeTimer(0);
  }, [setPhase, startChallengeTimer]);

  // ── Retry after timeout ────────────────────────────────────────────────────
  const retryChallenge = useCallback(() => {
    applyReset(buildChallengeSequence(challengeCount, challengeSequence));
  }, [applyReset, challengeCount, challengeSequence]);

  // ── Side-capture yaw tracking (post-liveness) ──────────────────────────────
  const analyzeForSideCapture = useCallback(async (): Promise<void> => {
    if (!modelsLoaded) return;
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    if (!video) return;

    try {
      await waitForVideoReady(video);
      const detections = await faceapi
        .detectAllFaces(video, TINY_OPTIONS_FAST)
        .withFaceLandmarks();

      if (!detections || detections.length !== 1) {
        updateLandmarkStatus({
          ...prevLandmarkRef.current,
          faceDetected: false,
          faceBox:      null,
          yawEstimate:  0,
        });
        return;
      }

      const det    = detections[0];
      const rawBox = det.detection.box;
      updateLandmarkStatus({
        faceDetected: true,
        yawEstimate:  roundYaw(computeYawFromLandmarks(det.landmarks)),
        qualityOk:    computeFaceQuality(det),
        hint:         "Turn your head to the right for the side photo.",
        faceBox:      { x: rawBox.x, y: rawBox.y, width: rawBox.width, height: rawBox.height },
      });
    } catch {
      // Non-critical tracking — silent failure is intentional
    }
  }, [modelsLoaded, webcamRef, updateLandmarkStatus]);

  // ── Main analysis loop ─────────────────────────────────────────────────────
  const analyzeLiveFace = useCallback(async (): Promise<void> => {
    if (!modelsLoaded) return;
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    if (!video) return;

    const currentPhase = phaseRef.current;

    // ── DETECTING / READY ────────────────────────────────────────────────
    if (currentPhase === "detecting" || currentPhase === "ready") {
      try {
        await waitForVideoReady(video);
        const detections = await faceapi
          .detectAllFaces(video, TINY_OPTIONS_DETECT)
          .withFaceLandmarks();

        if (detections?.length > 1) {
          updateLandmarkStatus({
            ...prevLandmarkRef.current,
            faceDetected: false,
            faceBox:      null,
            hint:         "Only one person should be in frame.",
          });
          if (currentPhase === "ready") setPhase("detecting");
          return;
        }

        const rawBox      = detections?.length === 1 ? detections[0].detection.box : null;
        const inOval      = rawBox ? isFaceInOval(rawBox, video.videoWidth, video.videoHeight) : false;
        const faceDetected = !!rawBox && inOval;
        const faceBox      = rawBox
          ? { x: rawBox.x, y: rawBox.y, width: rawBox.width, height: rawBox.height }
          : null;

        const hint = !rawBox
          ? "Center your face inside the frame."
          : !inOval
            ? "Move your face into the oval guide."
            : "Face detected! Click 'I'm Ready' to begin.";

        updateLandmarkStatus({ ...prevLandmarkRef.current, faceDetected, faceBox, hint });

        if (currentPhase === "ready"    && !faceDetected) setPhase("detecting");
        if (currentPhase === "detecting" && faceDetected) setPhase("ready");
      } catch (err) {
        console.error("[useFaceLiveness] detection error:", err);
      }
      return;
    }

    // ── CHALLENGING ──────────────────────────────────────────────────────
    if (currentPhase !== "challenging") return;

    const currentIndex    = challengeIndexRef.current;
    const currentSequence = challengeSequenceRef.current;
    const currentChallenge: LivenessChallenge =
      currentSequence[currentIndex] ??
      currentSequence[currentSequence.length - 1];

    if (POSE_CHALLENGES.has(currentChallenge) && !areGestureModelsLoaded()) {
      updateLandmarkStatus({
        ...prevLandmarkRef.current,
        hint: "Almost ready… preparing gesture detection.",
      });
      return;
    }

    try {
      await waitForVideoReady(video);

      const detections = await faceapi
        .detectAllFaces(video, TINY_OPTIONS_CHALLENGE)
        .withFaceLandmarks();

      if (!detections || detections.length === 0) {
        updateLandmarkStatus({
          faceDetected: false,
          yawEstimate:  0,
          qualityOk:    false,
          hint:         "No face detected. Move closer or improve lighting.",
          faceBox:      null,
        });
        return;
      }

      if (detections.length > 1) {
        updateLandmarkStatus({
          faceDetected: false,
          yawEstimate:  0,
          qualityOk:    false,
          hint:         "Only one person should be in frame.",
          faceBox:      null,
        });
        return;
      }

      const detection    = detections[0];
      const yaw          = computeYawFromLandmarks(detection.landmarks);
      const qualityOk    = computeFaceQuality(detection);
      const gestureFrame = areGestureModelsLoaded() ? detectGestures(video) : null;
      const rawBox       = detection.detection.box;
      const faceBox      = { x: rawBox.x, y: rawBox.y, width: rawBox.width, height: rawBox.height };

      let hint      = CHALLENGE_CONFIGS[currentChallenge].instruction;
      let framePass = false;

      switch (currentChallenge) {
        case "center":
          framePass = Math.abs(yaw) < 0.10 && qualityOk;
          if (framePass) {
            hint = passStreakRef.current > 0
              ? `✓ Hold still… (${passStreakRef.current + 1}/${PASS_STREAK_REQUIRED})`
              : "Face centered — hold still";
          } else {
            hint = Math.abs(yaw) >= 0.10
              ? "Face the camera directly"
              : "Hold still — checking quality…";
          }
          break;

        case "lookLeft": {
          const pct = Math.min(100, Math.round(Math.max(0, yaw) / TURN_YAW_TARGET * 100));
          // qualityOk excluded: the face box shrinks and score drops when
          // turning, but yaw measurement remains reliable.
          framePass = yaw > TURN_YAW_TARGET;
          hint = framePass
            ? (passStreakRef.current > 0 ? "✓ Hold that position!" : "✓ Good turn — hold it!")
            : pct > 45
              ? `Almost there — keep turning left (${pct}%)`
              : "Turn your head to the left";
          break;
        }

        case "lookRight": {
          const pct = Math.min(100, Math.round(Math.max(0, -yaw) / TURN_YAW_TARGET * 100));
          framePass = yaw < -TURN_YAW_TARGET;
          hint = framePass
            ? (passStreakRef.current > 0 ? "✓ Hold that position!" : "✓ Good turn — hold it!")
            : pct > 45
              ? `Almost there — keep turning right (${pct}%)`
              : "Turn your head to the right";
          break;
        }

        case "moveCloser": {
          const ratio = computeFaceSizeRatio(detection, video.videoWidth || 720);
          if (moveCloserBaselineRef.current === null) {
            moveCloserBaselineRef.current = ratio;
          }
          const movedBy     = ratio - moveCloserBaselineRef.current;
          const progressPct = Math.min(100, Math.round(movedBy / CLOSER_DELTA * 100));
          framePass = movedBy >= CLOSER_DELTA && ratio >= CLOSER_MIN_RATIO;
          hint = framePass
            ? "✓ Close enough — hold still!"
            : progressPct > 40
              ? `Almost there — ${progressPct}% closer, keep going`
              : "Move your face closer to the camera";
          break;
        }

        case "raiseLeftHand":
          if (gestureFrame && isRaisingLeftHand(gestureFrame.pose)) {
            framePass = true;
            hint = "✓ Left hand raised!";
          }
          break;

        case "raiseRightHand":
          if (gestureFrame && isRaisingRightHand(gestureFrame.pose)) {
            framePass = true;
            hint = "✓ Right hand raised!";
          }
          break;

        case "nodHead":
          if (gestureFrame) {
            const pitch = computePitchFromPose(gestureFrame.pose);
            if (pitch !== null && detectNodFromWindow(pitchWindow.current, pitch)) {
              framePass = true;
              hint = "✓ Head nod detected!";
            }
          }
          break;
      }

      if (framePass) {
        passStreakRef.current += 1;
        if (passStreakRef.current >= PASS_STREAK_REQUIRED) {
          playSuccessBeep();
          advanceChallengeRef.current(true, currentIndex, currentChallenge);
        }
      } else {
        passStreakRef.current = 0;
      }

      updateLandmarkStatus({ faceDetected: true, yawEstimate: roundYaw(yaw), qualityOk, hint, faceBox });
    } catch (err) {
      console.error("[useFaceLiveness] challenge detection error:", err);
    }
  }, [modelsLoaded, webcamRef, updateLandmarkStatus, setPhase]);

  // ── Detection interval ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !modelsLoaded) return;

    intervalRef.current = window.setInterval(() => {
      const p = phaseRef.current;
      if (p === "timeout") return;
      // Skip this tick if the previous detection is still running.
      // Prevents overlapping TF.js/WebGL calls and eliminates the
      // race condition where two ticks both call advanceChallenge.
      if (isProcessingRef.current) return;

      isProcessingRef.current = true;
      const work = p === "done" ? analyzeForSideCapture() : analyzeLiveFace();
      void work.finally(() => { isProcessingRef.current = false; });
    }, DETECTION_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, modelsLoaded, analyzeLiveFace, analyzeForSideCapture]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => clearChallengeTimer(), [clearChallengeTimer]);

  // ── Warm up the 416px TF.js kernel ───────────────────────────────────────
  // The detecting phase runs at 224px. The first challenge tick at 416px
  // triggers WebGL shader compilation — a one-time freeze. Running a
  // silent warmup detection 1.5 s after models load eliminates this.
  useEffect(() => {
    if (!modelsLoaded) return;
    let cancelled = false;
    const warmUp = async () => {
      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      if (!video || cancelled) return;
      try {
        await waitForVideoReady(video);
        if (!cancelled) {
          await faceapi.detectAllFaces(video, TINY_OPTIONS_CHALLENGE).withFaceLandmarks();
        }
      } catch { /* non-critical */ }
    };
    const t = window.setTimeout(() => void warmUp(), 1500);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [modelsLoaded, webcamRef]);

  // ── Full reset (called from App handleReset) ───────────────────────────────
  const resetLiveness = useCallback(() => {
    applyReset(buildChallengeSequence(challengeCount));
  }, [applyReset, challengeCount]);

  return {
    phase,
    landmarkStatus,
    livenessCompleted,
    livenessChallenge,
    livenessDone,
    challengeSequence,
    challengeIndex,
    challengeTimeLeft,
    startChallenges,
    retryChallenge,
    resetLiveness,
  };
}
