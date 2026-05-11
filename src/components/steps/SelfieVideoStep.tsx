// src/components/steps/SelfieVideoStep.tsx
//
// FR-015  Liveness Selfie Video — mandatory
//         Accepted formats: MP4, MOV (video/quicktime), WebM
//         Max duration: 10 seconds
//         Max size: 20 MB
//         Supports live recording (MediaRecorder) and file upload

import { useRef, useState, useCallback, useEffect } from "react";
import {
  SELFIE_VIDEO_MAX_SECONDS,
  SELFIE_VIDEO_MAX_MB,
  SELFIE_VIDEO_ACCEPTED_MIME,
  videoConstraints,
} from "../../lib/constants/kyc.constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelfieVideoStepProps {
  selfieVideoBlob: Blob | null;
  selfieVideoUrl: string;
  setSelfieVideo: (blob: Blob, url: string) => void;
  nextStep: () => void;
  prevStep: () => void;
}

type RecordPhase = "idle" | "countdown" | "recording" | "preview";

// ── Component ─────────────────────────────────────────────────────────────────

export default function SelfieVideoStep({
  selfieVideoBlob,
  selfieVideoUrl,
  setSelfieVideo,
  nextStep,
  prevStep,
}: SelfieVideoStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [cameraReady, setCameraReady] = useState(false);

  // ── Camera setup ─────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch {
      setError(
        "Camera access was denied or is unavailable. Please use file upload instead.",
      );
      setMode("upload");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (mode === "camera" && phase === "idle" && !selfieVideoUrl) {
      void startCamera();
    }
    return () => {
      if (mode !== "camera") stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Clean up on unmount
  useEffect(
    () => () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [stopCamera],
  );

  // ── Countdown then record ─────────────────────────────────────────────────

  const startCountdown = useCallback(() => {
    setError("");
    setCountdown(3);
    setPhase("countdown");

    let remaining = 3;
    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        startRecording();
      }
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    );

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      setSelfieVideo(blob, url);
      stopCamera();
      setPhase("preview");
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);

    setRecordingSeconds(0);
    setPhase("recording");

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setRecordingSeconds(elapsed);
      if (elapsed >= SELFIE_VIDEO_MAX_SECONDS) {
        stopRecording();
      }
    }, 1000);
  }, [setSelfieVideo, stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── File upload ──────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError("");
      const file = e.target.files?.[0];
      if (!file) return;

      const accepted = (SELFIE_VIDEO_ACCEPTED_MIME as readonly string[]).includes(
        file.type,
      );
      if (!accepted) {
        setError("Only MP4, MOV, or WebM video files are accepted.");
        e.target.value = "";
        return;
      }

      if (file.size > SELFIE_VIDEO_MAX_MB * 1024 * 1024) {
        setError(`Video must be under ${SELFIE_VIDEO_MAX_MB} MB.`);
        e.target.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      setSelfieVideo(file, url);
      setPhase("preview");
      e.target.value = "";
    },
    [setSelfieVideo],
  );

  // ── Re-record ────────────────────────────────────────────────────────────

  const handleRetake = useCallback(() => {
    if (selfieVideoUrl) URL.revokeObjectURL(selfieVideoUrl);
    setSelfieVideo(null as unknown as Blob, "");
    setPhase("idle");
    setRecordingSeconds(0);
    setError("");
    if (mode === "camera") {
      void startCamera();
    }
  }, [selfieVideoUrl, setSelfieVideo, mode, startCamera]);

  // ── Continue ─────────────────────────────────────────────────────────────

  const handleNext = () => {
    setSubmitAttempted(true);
    if (!selfieVideoUrl) {
      setError("Please record or upload a selfie video before continuing.");
      return;
    }
    nextStep();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const showCamera = mode === "camera" && phase !== "preview" && !selfieVideoUrl;
  const isRecording = phase === "recording";

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-semibold">Selfie video</h2>
        <p className="mt-1 text-sm text-slate-300">
          Record a short liveness video (up to {SELFIE_VIDEO_MAX_SECONDS} seconds) or
          upload one. This helps us verify that you are physically present.
          Accepted: MP4, MOV, WebM · max {SELFIE_VIDEO_MAX_MB} MB.
        </p>
      </div>

      {/* ── Mode toggle ───────────────────────────────────────────────────── */}
      {!selfieVideoUrl && (
        <div className="flex gap-2">
          {(["camera", "upload"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m !== mode) {
                  if (m === "upload") stopCamera();
                  else void startCamera();
                  setMode(m);
                  setPhase("idle");
                }
              }}
              className={`rounded-2xl px-4 py-2 text-sm capitalize transition-colors ${
                mode === m
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
            >
              {m === "camera" ? "Record video" : "Upload video"}
            </button>
          ))}
        </div>
      )}

      {/* ── Camera view ───────────────────────────────────────────────────── */}
      {showCamera && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative">
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover bg-slate-900"
          />

          {/* Countdown overlay */}
          {phase === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-7xl font-bold text-white tabular-nums">
                {countdown}
              </span>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-medium text-white tabular-nums">
                {recordingSeconds}s / {SELFIE_VIDEO_MAX_SECONDS}s
              </span>
            </div>
          )}

          {/* Progress bar */}
          {isRecording && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
              <div
                className="h-full bg-rose-500 transition-all duration-1000"
                style={{
                  width: `${(recordingSeconds / SELFIE_VIDEO_MAX_SECONDS) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Camera controls ───────────────────────────────────────────────── */}
      {showCamera && cameraReady && (
        <div className="flex justify-center gap-3">
          {phase === "idle" && (
            <button
              onClick={startCountdown}
              className="rounded-2xl bg-rose-500 px-8 py-3 font-semibold text-white hover:bg-rose-400 transition-colors flex items-center gap-2"
            >
              <span className="h-3 w-3 rounded-full bg-white" />
              Start recording
            </button>
          )}
          {(phase === "countdown" || isRecording) && (
            <button
              onClick={stopRecording}
              disabled={phase === "countdown"}
              className="rounded-2xl border border-slate-700 px-8 py-3 font-semibold text-slate-200
                hover:bg-slate-800 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Stop recording
            </button>
          )}
        </div>
      )}

      {/* ── Upload zone ───────────────────────────────────────────────────── */}
      {mode === "upload" && !selfieVideoUrl && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors
            ${
              submitAttempted && !selfieVideoUrl
                ? "border-rose-500 bg-rose-500/5 hover:border-rose-400"
                : "border-slate-700 hover:border-slate-500 hover:bg-slate-900"
            }`}
        >
          <svg
            className="h-10 w-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.882V15.118a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <div>
            <p className="text-base font-medium text-slate-200">
              Click to upload selfie video
            </p>
            <p className="mt-1 text-sm text-slate-400">
              MP4, MOV, or WebM · max {SELFIE_VIDEO_MAX_MB} MB · up to{" "}
              {SELFIE_VIDEO_MAX_SECONDS} seconds
            </p>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── Video preview ─────────────────────────────────────────────────── */}
      {selfieVideoUrl && (
        <div className="rounded-2xl border border-emerald-600/40 bg-slate-950 p-4 space-y-4">
          <p className="text-xs uppercase tracking-wide text-emerald-400 font-medium">
            ✓ Video captured
          </p>
          <video
            src={selfieVideoUrl}
            controls
            playsInline
            className="w-full rounded-xl bg-slate-900 aspect-video"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRetake}
              className="rounded-2xl border border-slate-700 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Retake / replace
            </button>
          </div>
        </div>
      )}

      {/* ── Tips ─────────────────────────────────────────────────────────── */}
      {!selfieVideoUrl && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Tips for a good selfie video
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Face the camera directly in good lighting</li>
            <li>• Keep your full face visible throughout the recording</li>
            <li>• Stay still and look naturally at the camera</li>
            <li>• Remove glasses, hats, or any face coverings</li>
            <li>• Make sure the background is not too bright or dark</li>
          </ul>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <p className="rounded-xl border border-rose-700/50 bg-rose-900/20 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
        <button
          onClick={prevStep}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 hover:bg-cyan-400 transition-colors"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
