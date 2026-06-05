// src/hooks/useSelfie.ts

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { detectPossibleSpoof } from "../lib/services/spoof.service";
import { dataUrlToImage } from "../utils/image";
import { playSuccessBeep } from "../utils/audio";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapturePhase =
  | "idle"
  | "front-instruction"
  | "front-countdown"
  | "front-captured"
  | "side-instruction"
  | "side-ready"
  | "side-captured"
  | "review"
  | "complete";

export type CaptureStatus = {
  phase: CapturePhase;
  countdown: number;
  flashActive: boolean;
  yawProgress: number;
};

interface UseSelfieProps {
  webcamRef: RefObject<Webcam | null>;
  livenessDone: boolean;
  yawEstimate: number;
  pushError: (scope: string, message: string) => void;
  clearError: () => void;
  nextStep: () => void;
}

interface UseSelfieReturn {
  selfieImage: string;
  faceSidePhoto: string;
  captureStatus: CaptureStatus;
  captureSelfie: () => Promise<void>;
  captureFaceSidePhoto: () => Promise<void>;
  confirmPhotos: () => void;
  resetSelfie: () => void;
  setSelfieImage: (v: string) => void;
  setFaceSidePhoto: (v: string) => void;
  startFrontCapture: () => void;
  startSideCapture: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRONT_COUNTDOWN_SEC = 3;
const FLASH_DURATION_MS   = 400;
const SIDE_YAW_FULL       = 0.32;
const SIDE_HOLD_SEC       = 3;

// ─── Helper: un-mirror webcam screenshot ──────────────────────────────────────

function unmirrorDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSelfie({
  webcamRef,
  livenessDone,
  yawEstimate,
  pushError,
  clearError,
  nextStep,
}: UseSelfieProps): UseSelfieReturn {
  const [selfieImage,   setSelfieImage]   = useState("");
  const [faceSidePhoto, setFaceSidePhoto] = useState("");

  const [capturePhase, setCapturePhase] = useState<CapturePhase>("idle");
  const [countdown,    setCountdown]    = useState(FRONT_COUNTDOWN_SEC);
  const [flashActive,  setFlashActive]  = useState(false);

  const capturePhaseRef   = useRef<CapturePhase>("idle");
  const countdownRef      = useRef(FRONT_COUNTDOWN_SEC);
  const countdownTimerRef = useRef<number | null>(null);
  const sideTimerRef      = useRef<number | null>(null);
  const flashTimerRef     = useRef<number | null>(null);

  const setPhase = (p: CapturePhase) => {
    capturePhaseRef.current = p;
    setCapturePhase(p);
  };

  // ── Transition to front-instruction when liveness completes ──────────────
  useEffect(() => {
    if (livenessDone && capturePhase === "idle") {
      setPhase("front-instruction");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livenessDone]);

  // ── Yaw progress for side overlay ─────────────────────────────────────────
  const yawProgress = Math.min(1, Math.abs(yawEstimate) / SIDE_YAW_FULL);

  // ── Flash helper ───────────────────────────────────────────────────────────
  const triggerFlash = useCallback(() => {
    setFlashActive(true);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setFlashActive(false);
    }, FLASH_DURATION_MS);
  }, []);

  // ── Clear front countdown ──────────────────────────────────────────────────
  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // ── Clear side hold timer ──────────────────────────────────────────────────
  const clearSideTimer = useCallback(() => {
    if (sideTimerRef.current) {
      window.clearInterval(sideTimerRef.current);
      sideTimerRef.current = null;
    }
  }, []);

  // ── Internal: do the actual front capture ──────────────────────────────────
  const doCaptureFront = useCallback(async () => {
    try {
      clearError();
      const dataUrl = webcamRef.current?.getScreenshot({ width: 1280, height: 720 });
      if (!dataUrl) throw new Error("Webcam screenshot failed.");

      const unmirrored = await unmirrorDataUrl(dataUrl);

      const spoof = await detectPossibleSpoof(unmirrored);
      if (spoof) {
        pushError("security", "Possible spoof detected. Please try again.");
        setPhase("front-instruction");
        return;
      }

      const imgEl = await dataUrlToImage(unmirrored);
      const facePresent = await faceapi.detectSingleFace(
        imgEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }),
      );
      if (!facePresent) throw new Error("No face detected. Please center your face and try again.");

      triggerFlash();
      playSuccessBeep();
      setSelfieImage(unmirrored);
      setPhase("front-captured");

      window.setTimeout(() => {
        setPhase("side-instruction");
      }, 600);
    } catch (err) {
      pushError("selfie", err instanceof Error ? err.message : "Selfie capture failed.");
      setPhase("front-instruction");
    }
  }, [webcamRef, pushError, clearError, triggerFlash]);

  // ── Front countdown: starts immediately when user clicks Ready ─────────────
  const startCountdown = useCallback(() => {
    clearCountdown();
    let remaining = FRONT_COUNTDOWN_SEC;
    countdownRef.current = remaining;
    setCountdown(remaining);
    setPhase("front-countdown");

    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      countdownRef.current = remaining;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearCountdown();
        void doCaptureFront();
      }
    }, 1000);
  }, [clearCountdown, doCaptureFront]);

  const startFrontCapture = useCallback(() => {
    startCountdown();
  }, [startCountdown]);

  // ── Manual fallback: capture front selfie ──────────────────────────────────
  const captureSelfie = useCallback(async () => {
    if (!livenessDone) {
      pushError("liveness", "Complete liveness check first.");
      return;
    }
    clearCountdown();
    await doCaptureFront();
  }, [livenessDone, pushError, clearCountdown, doCaptureFront]);

  // ── Internal: do the actual side capture ──────────────────────────────────
  const doCaptureSide = useCallback(async () => {
    try {
      const dataUrl = webcamRef.current?.getScreenshot({ width: 1280, height: 720 });
      if (!dataUrl) return;
      const unmirrored = await unmirrorDataUrl(dataUrl);
      triggerFlash();
      playSuccessBeep();
      setFaceSidePhoto(unmirrored);
      setPhase("side-captured");

      window.setTimeout(() => {
        setPhase("review");
      }, 700);
    } catch {
      // non-critical
    }
  }, [webcamRef, triggerFlash]);

  // ── Confirm photos and advance to next step ────────────────────────────────
  const confirmPhotos = useCallback(() => {
    setPhase("complete");
    nextStep();
  }, [nextStep]);

  // ── Side countdown: starts immediately when user clicks Ready ──────────────
  const startSideCountdown = useCallback(() => {
    if (sideTimerRef.current !== null) return; // already counting
    let remaining = SIDE_HOLD_SEC;
    setCountdown(remaining);
    setPhase("side-ready");

    sideTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      countdownRef.current = remaining;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearSideTimer();
        void doCaptureSide();
      }
    }, 1000);
  }, [clearSideTimer, doCaptureSide]);

  const startSideCapture = useCallback(() => {
    startSideCountdown();
  }, [startSideCountdown]);

  // ── Public: manual fallback side capture ───────────────────────────────────
  const captureFaceSidePhoto = useCallback(async () => {
    clearSideTimer();
    await doCaptureSide();
  }, [clearSideTimer, doCaptureSide]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetSelfie = useCallback(() => {
    clearCountdown();
    clearSideTimer();
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    setSelfieImage("");
    setFaceSidePhoto("");
    setPhase("idle");
    setCountdown(FRONT_COUNTDOWN_SEC);
    setFlashActive(false);
  }, [clearCountdown, clearSideTimer]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearCountdown();
      clearSideTimer();
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, [clearCountdown, clearSideTimer]);

  const captureStatus: CaptureStatus = {
    phase: capturePhase,
    countdown,
    flashActive,
    yawProgress,
  };

  return {
    selfieImage,
    faceSidePhoto,
    captureStatus,
    captureSelfie,
    captureFaceSidePhoto,
    confirmPhotos,
    resetSelfie,
    setSelfieImage,
    setFaceSidePhoto,
    startFrontCapture,
    startSideCapture,
  };
}
