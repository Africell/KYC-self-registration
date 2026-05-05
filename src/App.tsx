// src/App.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Webcam from "react-webcam";

import { useKYCFlow } from "./hooks/useKYCFlow";
import { useModels } from "./hooks/useModels";
import { useSelfie } from "./hooks/useSelfie";
import { useDocument } from "./hooks/useDocument";
import { useOCR } from "./hooks/useOCR";
import { useFaceMatch } from "./hooks/useFaceMatch";
import { useFaceLiveness } from "./hooks/useFaceLiveness";

import { buildPayload } from "./lib/services/payload.service";
import {
  videoConstraints,
  docVideoConstraints,
  steps,
} from "./lib/constants/kyc.constants";
import { loadSession, saveSession, startExpiryWatcher } from "./lib/services/session.service";

import Header from "./components/layout/Header";
import Stepper from "./components/layout/Stepper";
import MSISDNStep from "./components/steps/MSISDNStep";
import ConsentStep from "./components/steps/ConsentStep";
import SelfieStep from "./components/steps/SelfieStep";
import DocumentStep from "./components/steps/DocumentStep";
import OCRStep from "./components/steps/OCRStep";
import FaceMatchStep from "./components/steps/FaceMatchStep";
import ReviewStep from "./components/steps/ReviewStep";

import { LanguageSwitcher } from "./components/layout/LanguageSwitcher";
import { transformToBackendPayload } from "./utils/image";
import { useSessionTimers } from "./hooks/useSessionTimers";

export default function App(): JSX.Element {
  const selfieWebcamRef = useRef<Webcam | null>(null);
  const docWebcamRef = useRef<Webcam | null>(null);

  // ── Rehydration guard ─────────────────────────────────────────────────────
  // Prevents save-watchers from overwriting restored session data on mount.
  const isRehydrating = useRef(true);

  // ── flow & error ──────────────────────────────────────────────────────────
  const {
    stepIndex,
    activeStep,
    error,
    agreed,
    setAgreed,
    nextStep,
    prevStep,
    pushError,
    clearError,
    resetFlow,
  } = useKYCFlow();

  // ── model loading ─────────────────────────────────────────────────────────
  const { modelsLoaded } = useModels(pushError);

  // ── liveness ──────────────────────────────────────────────────────────────
  const {
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
  } = useFaceLiveness({
    webcamRef: selfieWebcamRef,
    modelsLoaded,
    active: activeStep.key === "selfie",
    challengeCount: 3,
  });

  // src/App.tsx — updated hook destructuring + rehydration block only
  // Everything else stays identical to the previous version.

  // ── selfie — destructure setFaceSidePhoto ────────────────────────────────────
  const {
    selfieImage,
    faceSidePhoto,
    captureStatus,
    captureSelfie,
    captureFaceSidePhoto,
    resetSelfie,
    setSelfieImage,
    setFaceSidePhoto, // ← add this
  } = useSelfie({
    webcamRef: selfieWebcamRef,
    livenessDone,
    yawEstimate: landmarkStatus.yawEstimate,
    faceQualityOk: landmarkStatus.qualityOk,
    faceDetected: landmarkStatus.faceDetected,
    pushError,
    clearError,
    nextStep,
  });

  // ── Rehydrate on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const s = loadSession();

    if (s) {
      if (s.msisdn) setMsisdn(s.msisdn);
      if (s.selfieImage) setSelfieImage(s.selfieImage);
      if (s.faceSidePhoto) setFaceSidePhoto(s.faceSidePhoto); // ← add this

      rehydrateDocument({
        documentImage: s.documentImage,
        documentBackImage: s.documentBackImage,
        documentQuality: s.documentQuality,
        documentBackQuality: s.documentBackQuality,
      });

      rehydrateOCR({
        fields: s.fields,
        mrzValid: s.mrzValid,
        mrzMessage: s.mrzMessage,
      });

      rehydrateFaceMatch({ faceMatch: s.faceMatch });
    }

    requestAnimationFrame(() => {
      isRehydrating.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── document ──────────────────────────────────────────────────────────────
  const {
    documentImage,
    documentQuality,
    documentBackImage,
    documentBackQuality,
    documentPreviewMode,
    setDocumentPreviewMode,
    captureDocument,
    captureDocumentBack,
    handleDocumentUpload,
    handleDocumentBackUpload,
    saveDocumentBlobLocally,
    saveDocumentBackBlobLocally,
    rehydrateDocument,
    resetDocument,
  } = useDocument({ docWebcamRef, pushError, clearError });

  // ── OCR & MRZ ─────────────────────────────────────────────────────────────
  const {
    fields,
    setFields,
    mrzValid,
    mrzMessage,
    busy: ocrBusy,
    runOCRAndMRZ,
    rehydrateOCR,
    resetOCR,
  } = useOCR({ documentImage, pushError, clearError, nextStep });

  // ── face match ────────────────────────────────────────────────────────────
  const {
    faceMatch,
    busy: matchBusy,
    runFaceMatch,
    rehydrateFaceMatch,
    resetFaceMatch,
  } = useFaceMatch({
    selfieImage,
    documentImage,
    pushError,
    clearError,
    nextStep,
  });

  const timers = useSessionTimers();
  // ── MSISDN ────────────────────────────────────────────────────────────────
  const [msisdn, setMsisdn] = useState("");
  const [isEligible, setIsEligible] = useState<boolean | null>(null);

  // ── Rehydrate on mount (runs once, before watchers activate) ─────────────
  useEffect(() => {
    const s = loadSession();

    if (s) {
      if (s.msisdn) setMsisdn(s.msisdn);
      if (s.selfieImage) setSelfieImage(s.selfieImage);

      rehydrateDocument({
        documentImage: s.documentImage,
        documentBackImage: s.documentBackImage,
        documentQuality: s.documentQuality,
        documentBackQuality: s.documentBackQuality,
      });

      rehydrateOCR({
        fields: s.fields,
        mrzValid: s.mrzValid,
        mrzMessage: s.mrzMessage,
      });

      rehydrateFaceMatch({ faceMatch: s.faceMatch });
    }

    // Allow save-watchers to start firing after this tick.
    // requestAnimationFrame ensures all the setState calls above have
    // been batched and committed before we lift the guard.
    requestAnimationFrame(() => {
      isRehydrating.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // ── Auto-save watchers ────────────────────────────────────────────────────
  // Each watcher skips the first render while rehydration is in progress.
  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ msisdn });
  }, [msisdn]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ selfieImage });
  }, [selfieImage]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ faceSidePhoto });
  }, [faceSidePhoto]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ documentImage });
  }, [documentImage]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ documentBackImage });
  }, [documentBackImage]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ documentQuality });
  }, [documentQuality]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ documentBackQuality });
  }, [documentBackQuality]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ fields });
  }, [fields]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ mrzValid, mrzMessage });
  }, [mrzValid, mrzMessage]);

  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession({ faceMatch });
  }, [faceMatch]);
  // Inside App() component, after all hooks

  useEffect(() => {
    const cleanup = startExpiryWatcher();
    return cleanup;
  }, []);

  // ── payload ───────────────────────────────────────────────────────────────
  const internalPayload = useMemo(
    () =>
      buildPayload({
        consentAccepted: agreed,
        selfieImage,
        faceSidePhoto,
        documentImage,
        documentBackImage,
        livenessDone,
        livenessCompleted,
        finalYawEstimate: landmarkStatus.yawEstimate,
        documentQuality,
        fields,
        mrzValid,
        mrzMessage,
        faceMatch,
      }),
    [
      agreed,
      selfieImage,
      faceSidePhoto,
      documentImage,
      documentBackImage,
      livenessDone,
      livenessCompleted,
      landmarkStatus.yawEstimate,
      documentQuality,
      fields,
      mrzValid,
      mrzMessage,
      faceMatch,
    ],
  );

  const backendPayload = useMemo(
    () => transformToBackendPayload(internalPayload, msisdn),
    [internalPayload, msisdn],
  );

  // ── reset all ─────────────────────────────────────────────────────────────
  const handleReset = () =>
    resetFlow(() => {
      resetSelfie();
      resetDocument();
      resetOCR();
      resetFaceMatch();
      resetLiveness();
      setMsisdn("");
      setIsEligible(null);
    });

  // ── export payload ────────────────────────────────────────────────────────
  const exportPayloadFile = () => {
    const blob = new Blob([JSON.stringify(backendPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kyc-payload-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-20 bg-[#a11775] flex justify-center flex-col text-slate-100">
      <LanguageSwitcher timers={timers} />
      <div className="mx-auto max-w-7xl flex flex-col justify-center sm:py-10 py-3">
        <Header
          modelsLoaded={modelsLoaded}
          activeStepLabel={activeStep.label}
        />
        <Stepper steps={steps} stepIndex={stepIndex} />

        {error && (
          <div className="mb-6 rounded-2xl border border-[#ee7d00] bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <strong className="mr-2 uppercase tracking-wide">
              {error.scope}
            </strong>
            {error.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] w-full">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
            {activeStep.key === "msisdn" && (
              <MSISDNStep
                msisdn={msisdn}
                setMsisdn={setMsisdn}
                setIsEligible={setIsEligible}
                nextStep={nextStep}
                isEligible={isEligible}
              />
            )}

            {activeStep.key === "consent" && (
              <ConsentStep
                agreed={agreed}
                setAgreed={setAgreed}
                nextStep={nextStep}
                modelsLoaded={modelsLoaded}
              />
            )}

            {activeStep.key === "selfie" && (
              <SelfieStep
                selfieWebcamRef={selfieWebcamRef}
                videoConstraints={videoConstraints}
                landmarkStatus={landmarkStatus}
                livenessCompleted={livenessCompleted}
                livenessDone={livenessDone}
                captureSelfie={captureSelfie}
                prevStep={prevStep}
                selfieImage={selfieImage}
                faceSidePhoto={faceSidePhoto}
                captureFaceSidePhoto={captureFaceSidePhoto}
                livenessChallenge={livenessChallenge}
                challengeSequence={challengeSequence}
                challengeIndex={challengeIndex}
                challengeTimeLeft={challengeTimeLeft}
                phase={phase}
                startChallenges={startChallenges}
                retryChallenge={retryChallenge}
                captureStatus={captureStatus}
              />
            )}

            {activeStep.key === "document" && (
              <DocumentStep
                documentPreviewMode={documentPreviewMode}
                setDocumentPreviewMode={setDocumentPreviewMode}
                docWebcamRef={docWebcamRef}
                captureDocument={captureDocument}
                captureDocumentBack={captureDocumentBack}
                handleDocumentUpload={handleDocumentUpload}
                handleDocumentBackUpload={handleDocumentBackUpload}
                documentImage={documentImage}
                documentBackImage={documentBackImage}
                runOCRAndMRZ={runOCRAndMRZ}
                prevStep={prevStep}
                docVideoConstraints={docVideoConstraints}
                documentQuality={documentQuality}
                documentBackQuality={documentBackQuality}
                saveDocumentBlobLocally={saveDocumentBlobLocally}
                saveDocumentBackBlobLocally={saveDocumentBackBlobLocally}
                busy={ocrBusy}
              />
            )}

            {activeStep.key === "ocr" && (
              <OCRStep
                fields={fields}
                setFields={setFields}
                runFaceMatch={runFaceMatch}
                prevStep={prevStep}
                mrzValid={mrzValid}
                mrzMessage={mrzMessage}
                busy={matchBusy}
              />
            )}

            {activeStep.key === "match" && (
              <FaceMatchStep
                selfieImage={selfieImage}
                documentImage={documentImage}
                faceMatch={faceMatch}
                prevStep={prevStep}
                nextStep={nextStep}
              />
            )}

            {activeStep.key === "review" && (
              <ReviewStep
                internalPayload={internalPayload}
                backendPayload={backendPayload}
                prevStep={prevStep}
                exportPayloadFile={exportPayloadFile}
                resetFlow={handleReset}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
