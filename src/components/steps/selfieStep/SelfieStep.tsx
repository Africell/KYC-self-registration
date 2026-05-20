// src/components/steps/selfie/SelfieStep.tsx

import Webcam from "react-webcam";

import type { LivenessPhase } from "../../../hooks/useFaceLiveness";
import type { CaptureStatus } from "../../../hooks/useSelfie";
import type { LandmarkStatus, LivenessChallenge } from "../../../types/kyc";
import { CHALLENGE_CONFIGS } from "../../../lib/challenges";

import { AlarmClock, Camera, Check, Lock, RotateCcw } from "lucide-react";
import { TIMER_RADIUS, TIMER_CIRC } from "./selfie.constants";
import { TURN_YAW_TARGET } from "../../../lib/challenges";
import { CaptureProgressBar } from "./overlays/CaptureProgressBar";
import { StatusBanner } from "./overlays/StatusBanner";
import { CaptureFlash } from "./overlays/Captureflash";
import { FaceOvalOverlay } from "./overlays/FaceOvalOverlay";
import { SideGuideOverlay } from "./overlays/SideGuideOverlay";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelfieStepProps {
  selfieWebcamRef: React.RefObject<Webcam | null>;
  videoConstraints: object;
  landmarkStatus: LandmarkStatus;
  livenessCompleted: Record<LivenessChallenge, boolean>;
  livenessDone: boolean;
  captureSelfie: () => Promise<void>;
  prevStep: () => void;
  selfieImage: string;
  faceSidePhoto: string;
  captureFaceSidePhoto: () => Promise<void>;
  livenessChallenge: LivenessChallenge;
  challengeSequence: LivenessChallenge[];
  challengeIndex: number;
  challengeTimeLeft: number;
  phase: LivenessPhase;
  startChallenges: () => void;
  retryChallenge: () => void;
  retakeSelfie: () => void;
  captureStatus: CaptureStatus;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SelfieStep({
  selfieWebcamRef,
  videoConstraints,
  landmarkStatus,
  livenessCompleted,
  livenessDone,
  captureSelfie,
  prevStep,
  selfieImage,
  faceSidePhoto,
  captureFaceSidePhoto,
  livenessChallenge,
  challengeSequence,
  challengeIndex,
  challengeTimeLeft,
  phase,
  startChallenges,
  retryChallenge,
  retakeSelfie,
  captureStatus,
}: SelfieStepProps) {
  const currentConfig = CHALLENGE_CONFIGS[livenessChallenge];
  const ChallengeIcon = currentConfig.icon;
  const {
    phase: capturePhase,
    countdown,
    flashActive,
    yawProgress,
  } = captureStatus;

  const isSidePhase =
    capturePhase === "side-guide" ||
    capturePhase === "side-ready" ||
    capturePhase === "side-captured";
  const isCapturePhase = capturePhase !== "idle";

  // Timer arc — derived from props, no local state needed
  const timerPercent = Math.max(0, (challengeTimeLeft / 5) * 100);
  const timerColor =
    challengeTimeLeft > 3
      ? "#34d399"
      : challengeTimeLeft > 1
        ? "#fbbf24"
        : "#f87171";
  const timerDash = (timerPercent / 100) * TIMER_CIRC;

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">
            Selfie &amp; Liveness Check
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {!isCapturePhase && (
              <>
                {phase === "detecting" &&
                  "Position your face in the frame to begin."}
                {phase === "ready" &&
                  "Face detected! Ready to start the challenge."}
                {phase === "challenging" &&
                  `Challenge ${challengeIndex + 1} of ${challengeSequence.length}`}
                {phase === "timeout" && "Challenge timed out."}
                {phase === "done" &&
                  "Liveness verified — capturing photos now."}
              </>
            )}
            {isCapturePhase && (
              <>
                {capturePhase === "front-guide" &&
                  "Auto-capture will start when your face is ready."}
                {capturePhase === "front-countdown" &&
                  `Capturing in ${countdown}s — hold still!`}
                {capturePhase === "front-captured" && "Front photo captured!"}
                {capturePhase === "side-guide" &&
                  "Now turn your head to capture the side profile."}
                {capturePhase === "side-ready" &&
                  "Perfect! Tap the button to take the side photo."}
                {(capturePhase === "side-captured" ||
                  capturePhase === "complete") &&
                  "All done! Moving to next step…"}
              </>
            )}
          </p>
        </div>

        <div className="self-start sm:self-auto rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest shrink-0">
          {isCapturePhase
            ? isSidePhase
              ? "Step 2 / 2 — Side"
              : "Step 1 / 2 — Front"
            : phase === "done"
              ? <><Check size={10} className="inline-block mr-1 -mt-px" />Liveness verified</>

              : `Challenge ${challengeIndex + 1} / ${challengeSequence.length}`}
        </div>
      </div>

      {isCapturePhase && <CaptureProgressBar phase={capturePhase} />}

      <StatusBanner
        phase={phase}
        capturePhase={capturePhase}
        countdown={countdown}
        faceDetected={landmarkStatus.faceDetected}
        qualityOk={landmarkStatus.qualityOk}
        hint={landmarkStatus.hint}
      />

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* ── Webcam + overlays ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-black aspect-3/4 sm:aspect-4/3">
          <Webcam
            ref={selfieWebcamRef}
            audio={false}
            mirrored
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute inset-0 w-full h-full object-cover"
          />

          <CaptureFlash active={flashActive} />

          {!isSidePhase && (
            <FaceOvalOverlay
              faceBox={landmarkStatus.faceBox}
              faceDetected={landmarkStatus.faceDetected}
              qualityOk={landmarkStatus.qualityOk}
              phase={phase}
              capturePhase={capturePhase}
              countdown={countdown}
            />
          )}

          {isSidePhase && (
            <SideGuideOverlay
              yawProgress={yawProgress}
              isReady={capturePhase === "side-ready"}
            />
          )}

          {/* DETECTING */}
          {phase === "detecting" && !isCapturePhase && (
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-transparent pb-6 gap-3 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 rounded-2xl px-4 py-2">
                <div className="w-3 h-3 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin" />
                <p className="text-slate-300 text-xs">Detecting your face…</p>
              </div>
            </div>
          )}

          {/* READY */}
          {phase === "ready" && !isCapturePhase && (
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-transparent pb-6 gap-3">
              <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col items-center gap-3 mx-4 text-center w-full max-w-xs">
                <p className="text-base sm:text-lg font-semibold text-white">
                  Face Detected!
                </p>
                <p className="text-slate-300 text-xs sm:text-sm">
                  You'll be given{" "}
                  <strong className="text-cyan-300">
                    {challengeSequence.length} quick challenges
                  </strong>
                  . Each has{" "}
                  <strong className="text-cyan-300">10 seconds</strong>. Ready?
                </p>
                <button
                  onClick={startChallenges}
                  className="w-full rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 active:bg-cyan-300 transition-colors text-sm"
                >
                  I'm Ready →
                </button>
              </div>
            </div>
          )}

          {/* CHALLENGING */}
          {phase === "challenging" && !isCapturePhase && (
            <div className="absolute top-0 left-0 right-0 flex items-center gap-3 bg-black/80 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                className="shrink-0 -rotate-90"
              >
                <circle
                  cx="24"
                  cy="24"
                  r={TIMER_RADIUS}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={TIMER_RADIUS}
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="4"
                  strokeDasharray={`${timerDash} ${TIMER_CIRC}`}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dasharray 0.9s linear, stroke 0.3s",
                  }}
                />
                <text
                  x="24"
                  y="24"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  style={{
                    transform: "rotate(90deg)",
                    transformOrigin: "24px 24px",
                  }}
                >
                  {challengeTimeLeft}s
                </text>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                  Challenge {challengeIndex + 1} of {challengeSequence.length}
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-white truncate">
                  <ChallengeIcon size={18} className="shrink-0" />
                  {currentConfig.label}
                </div>
                {(livenessChallenge === "lookLeft" || livenessChallenge === "lookRight") && (
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-700/70 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{
                        width: `${Math.min(100, (Math.abs(landmarkStatus.yawEstimate) / TURN_YAW_TARGET) * 100)}%`,
                        background: Math.abs(landmarkStatus.yawEstimate) >= TURN_YAW_TARGET
                          ? "#34d399"
                          : "#22d3ee",
                      }}
                    />
                  </div>
                )}
                {livenessChallenge === "moveCloser" && landmarkStatus.hint.includes("%") && (
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-700/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all duration-150"
                      style={{
                        width: (() => {
                          const m = landmarkStatus.hint.match(/(\d+)%/);
                          return m ? `${Math.min(100, parseInt(m[1]))}%` : "0%";
                        })(),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TIMEOUT */}
          {phase === "timeout" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4 sm:gap-5 px-6 text-center">
              <AlarmClock size={48} className="animate-bounce text-amber-400" />
              <p className="text-xl sm:text-2xl font-semibold text-white">Time's Up!</p>
              <p className="text-slate-300 text-sm max-w-xs">
                You didn't complete the challenge in time. Let's try again.
              </p>
              <button
                onClick={retryChallenge}
                className="mt-1 rounded-2xl bg-amber-500 px-8 py-3 min-h-12 font-semibold text-slate-950 hover:bg-amber-400 active:bg-amber-300 transition-colors"
              >
                Retry Challenges →
              </button>
            </div>
          )}

          {/* FRONT-GUIDE: manual capture fallback */}
          {capturePhase === "front-guide" && (
            <div className="absolute inset-0 flex items-end justify-center pb-5 pointer-events-none">
              <div className="pointer-events-auto">
                <button
                  onClick={() => void captureSelfie()}
                  className="rounded-2xl bg-black/60 border border-slate-600 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors backdrop-blur"
                >
                  Capture manually
                </button>
              </div>
            </div>
          )}

          {/* SIDE-READY: capture button on video */}
          {capturePhase === "side-ready" && (
            <div className="absolute inset-0 flex items-end justify-center pb-6">
              <button
                onClick={() => void captureFaceSidePhoto()}
                className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3 min-h-12 font-semibold text-slate-950 hover:bg-emerald-400 active:bg-emerald-300 transition-all shadow-lg shadow-emerald-900/40 text-sm"
              >
                <Camera size={16} /> Capture Side Photo
              </button>
            </div>
          )}

          {/* SIDE-GUIDE: disabled unlock button */}
          {capturePhase === "side-guide" && (
            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
              <button
                disabled
                className="rounded-2xl bg-slate-700/80 px-8 py-3 font-semibold text-slate-400 text-sm cursor-not-allowed"
              >
                Turn further to unlock →
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div className="space-y-3 sm:space-y-4">
          {/* Liveness: challenge progress list */}
          {!isCapturePhase && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                Challenge progress
              </div>
              <div className="space-y-2">
                {challengeSequence.map((id, i) => {
                  const cfg = CHALLENGE_CONFIGS[id];
                  const done = livenessCompleted[id];
                  const isCurrent =
                    phase === "challenging" && i === challengeIndex;
                  const isFuture =
                    phase !== "done" && i > challengeIndex && !done;
                  const CfgIcon = cfg.icon;

                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ${
                        done
                          ? "bg-emerald-950/60 border border-emerald-800/50"
                          : isCurrent
                            ? "bg-cyan-950 border border-cyan-700"
                            : "bg-slate-900 opacity-50"
                      }`}
                    >
                      <span className="flex items-center justify-center w-5 h-5">
                        {isFuture ? <Lock size={16} /> : <CfgIcon size={18} />}
                      </span>
                      <span
                        className={
                          done
                            ? "text-emerald-300"
                            : isCurrent
                              ? "text-cyan-200 font-medium"
                              : "text-slate-500"
                        }
                      >
                        {isFuture ? "Locked" : cfg.label}
                      </span>
                      <span className="ml-auto flex items-center">
                        {done ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : isCurrent ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        ) : (
                          <span className="w-2 h-2 rounded-full border border-slate-600 inline-block" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Capture: photo guide */}
          {isCapturePhase && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 space-y-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Photo guide
              </div>

              {/* Step 1 — Front */}
              <div
                className={`rounded-xl p-3 border transition-all ${
                  capturePhase === "front-guide" ||
                  capturePhase === "front-countdown"
                    ? "border-cyan-700 bg-cyan-950/40"
                    : capturePhase === "front-captured" || isSidePhase
                      ? "border-emerald-800/50 bg-emerald-950/30"
                      : "border-slate-700 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Camera size={15} className="shrink-0 text-slate-400" />
                  <span className="font-medium text-white">Front Photo</span>
                  {(capturePhase === "front-captured" || isSidePhase) && (
                    <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs">
                      <Check size={12} /> Done
                    </span>
                  )}
                  {(capturePhase === "front-guide" ||
                    capturePhase === "front-countdown") && (
                    <span className="ml-auto">
                      <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Face the camera directly. Auto-capture begins when your face
                  quality is good.
                </p>
              </div>

              {/* Step 2 — Side */}
              <div
                className={`rounded-xl p-3 border transition-all ${
                  capturePhase === "side-guide" || capturePhase === "side-ready"
                    ? "border-cyan-700 bg-cyan-950/40"
                    : capturePhase === "side-captured" ||
                        capturePhase === "complete"
                      ? "border-emerald-800/50 bg-emerald-950/30"
                      : "border-slate-700 bg-slate-900/40 opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={15} className="shrink-0 text-slate-400" />
                  <span className="font-medium text-white">Side Photo</span>
                  {(capturePhase === "side-captured" ||
                    capturePhase === "complete") && (
                    <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs">
                      <Check size={12} /> Done
                    </span>
                  )}
                  {(capturePhase === "side-guide" ||
                    capturePhase === "side-ready") && (
                    <span className="ml-auto">
                      <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Slowly turn your head right. The button activates when angle
                  is good.
                </p>

                {(capturePhase === "side-guide" ||
                  capturePhase === "side-ready") && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Turn angle</span>
                      <span>{Math.round(yawProgress * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${capturePhase === "side-ready" ? "bg-emerald-400" : "bg-cyan-400"}`}
                        style={{ width: `${yawProgress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview thumbnails */}
          {(selfieImage || faceSidePhoto) && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 space-y-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Captured
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selfieImage && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Front</div>
                    <img
                      src={selfieImage}
                      alt="Selfie"
                      className="rounded-xl w-full object-cover aspect-square"
                    />
                  </div>
                )}
                {faceSidePhoto && (
                  <div>
                    <div className="text-xs text-violet-400 mb-1">Side</div>
                    <img
                      src={faceSidePhoto}
                      alt="Side"
                      className="rounded-xl w-full object-cover aspect-square"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={prevStep}
          className="rounded-2xl border border-slate-700 px-5 py-3 min-h-12 text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors"
        >
          Back
        </button>

        {capturePhase === "complete" && selfieImage && (
          <button
            onClick={retakeSelfie}
            className="rounded-2xl border border-amber-500/50 bg-amber-500/10 px-5 py-3 min-h-12 text-sm font-medium text-amber-300 hover:bg-amber-500/20 active:bg-amber-500/30 transition-colors"
          >
            Retake photos
          </button>
        )}

        {!isCapturePhase && (
          <button
            disabled
            className="rounded-2xl bg-cyan-500/30 px-5 py-3 min-h-12 font-medium text-slate-400 cursor-not-allowed text-sm"
          >
            {livenessDone ? "Auto-capturing…" : "Complete liveness first"}
          </button>
        )}

        {capturePhase === "side-ready" && (
          <button
            onClick={() => void captureFaceSidePhoto()}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 min-h-12 font-medium text-slate-950 hover:bg-emerald-400 active:bg-emerald-300 transition-colors"
          >
            <Camera size={16} /> Capture Side Photo
          </button>
        )}

        {capturePhase === "side-guide" && (
          <button
            disabled
            className="rounded-2xl bg-slate-700 px-5 py-3 min-h-12 font-medium text-slate-500 cursor-not-allowed text-sm"
          >
            Turn your head to unlock →
          </button>
        )}
      </div>
    </section>
  );
}
