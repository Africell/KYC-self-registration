// src/App.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Webcam from "react-webcam";

import { useKYCFlow } from "./hooks/useKYCFlow";
import { useModels } from "./hooks/useModels";
// import { useSessionTimers } from "./hooks/useSessionTimers";
import { useSelfie } from "./hooks/useSelfie";
import { useDocument } from "./hooks/useDocument";
import { useOCR } from "./hooks/useOCR";
import { useFaceMatch } from "./hooks/useFaceMatch";
import { useFaceLiveness } from "./hooks/useFaceLiveness";

import { buildPayload } from "./lib/services/payload.service";
import {
  loadSession,
  saveSession,
  clearSession,
  startExpiryWatcher,
} from "./lib/services/session.service";
import {
  videoConstraints,
  docVideoConstraints,
  steps,
} from "./lib/constants/kyc.constants";

import Header from "./components/layout/Header";
import Stepper from "./components/layout/Stepper";
import MSISDNStep from "./components/steps/MSISDNStep";
import ConsentStep from "./components/steps/ConsentStep";
import SelfieStep from "./components/steps/selfieStep/SelfieStep";
import OCRStep from "./components/steps/OCRStep";
import FaceMatchStep from "./components/steps/FaceMatchStep";
import ReviewStep from "./components/steps/ReviewStep";
import { LanguageSwitcher } from "./components/layout/LanguageSwitcher";

import { apiSubmitSIMRegistration } from "./lib/api/kyc.api";
import { getStoredToken, clearOTP } from "./lib/services/msisdn.service";
import { transformToBackendPayload } from "./utils/image";
import type { SessionPatch } from "./lib/services/session.service";
import DocumentStep from "./components/steps/document/DocumentStep";
import SignatureStep from "./components/steps/Signaturestep";
import bgOkapi from "./assets/bg-okapi.jpg";

// ── Auto-save helper ──────────────────────────────────────────────────────────
// Consolidates the rehydration guard so it isn't copy-pasted across 10 effects.
// Only saves once the mount rehydration has completed (isRehydrating.current = false).

function useSaveSession(
  patch: SessionPatch,
  isRehydrating: React.RefObject<boolean>,
  deps: unknown[],
) {
  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession(patch);
    // deps drives when this fires — patch is intentionally not in the array
    // because we only want to save when the underlying values change, not
    // when the object reference changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const selfieWebcamRef = useRef<Webcam | null>(null);
  const docWebcamRef = useRef<Webcam | null>(null);

  // Prevents auto-save watchers from overwriting restored session data on mount.
  const isRehydrating = useRef(true);

  // ── Flow ──────────────────────────────────────────────────────────────────
  const {
    stepIndex,
    maxStepReached,
    activeStep,
    error,
    agreed,
    setAgreed,
    nextStep,
    prevStep,
    goToStep,
    pushError,
    clearError,
    resetFlow,
  } = useKYCFlow();

  // ── Models ────────────────────────────────────────────────────────────────
  const { modelsLoaded } = useModels(pushError);

  // ── Session timers ────────────────────────────────────────────────────────
  // Reads only from localStorage — no dependency on any React state.
  // const timers = useSessionTimers();

  // ── MSISDN ────────────────────────────────────────────────────────────────
  // Declared before the rehydration effect so setMsisdn is available when it runs.
  const [msisdn, setMsisdn] = useState("");

  // ── Document type ─────────────────────────────────────────────────────────
  const [docType, setDocType] = useState("");

  // ── Signature ─────────────────────────────────────────────────────────────
  const [signatureImage, setSignatureImageState] = useState("");

  const setSignatureImage = (dataUrl: string) => {
    setSignatureImageState(dataUrl);
    saveSession({ signatureImage: dataUrl });
  };

  // ── Liveness ──────────────────────────────────────────────────────────────
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

  // ── Selfie ────────────────────────────────────────────────────────────────
  const {
    selfieImage,
    faceSidePhoto,
    captureStatus,
    captureSelfie,
    captureFaceSidePhoto,
    resetSelfie,
    setSelfieImage,
    setFaceSidePhoto,
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

  // ── Document ──────────────────────────────────────────────────────────────
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
    handleDocumentDropFile,
    handleDocumentBackDropFile,
    documentUploading,
    documentBackUploading,
    saveDocumentBlobLocally,
    saveDocumentBackBlobLocally,
    rehydrateDocument,
    resetDocument,
  } = useDocument({ docWebcamRef, pushError, clearError, docType });

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
  } = useOCR({ documentImage, docType, pushError, clearError, nextStep });

  // ── Face match ────────────────────────────────────────────────────────────
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

  // ── Rehydration ───────────────────────────────────────────────────────────
  // Single effect, single loadSession() call.
  // requestAnimationFrame ensures all batched setState calls above have
  // committed before auto-save watchers are allowed to fire.
  useEffect(() => {
    const s = loadSession();

    if (s) {
      if (s.msisdn) setMsisdn(s.msisdn);
      if (s.docType) setDocType(s.docType);
      if (s.selfieImage) setSelfieImage(s.selfieImage);
      if (s.faceSidePhoto) setFaceSidePhoto(s.faceSidePhoto);
      if (s.signatureImage) setSignatureImageState(s.signatureImage);

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
  }, []); // mount only

  // ── Expiry watcher ────────────────────────────────────────────────────────
  // Registered immediately after rehydration — cleans up both the KYC session
  // and the OTP token when their 15-min TTL elapses.
  useEffect(() => startExpiryWatcher(), []);

  // Auto-dismiss errors after 6 seconds
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 10000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  // ── Auto-save watchers ────────────────────────────────────────────────────
  // Each patch is saved independently so unrelated state changes don't trigger
  // a full-session write. The rehydration guard is enforced inside useSaveSession.
  useSaveSession({ msisdn }, isRehydrating, [msisdn]);
  useSaveSession({ docType }, isRehydrating, [docType]);
  useSaveSession({ selfieImage }, isRehydrating, [selfieImage]);
  useSaveSession({ faceSidePhoto }, isRehydrating, [faceSidePhoto]);
  useSaveSession({ signatureImage }, isRehydrating, [signatureImage]);
  useSaveSession({ documentImage }, isRehydrating, [documentImage]);
  useSaveSession({ documentBackImage }, isRehydrating, [documentBackImage]);
  useSaveSession({ documentQuality }, isRehydrating, [documentQuality]);
  useSaveSession({ documentBackQuality }, isRehydrating, [documentBackQuality]);
  useSaveSession({ fields }, isRehydrating, [fields]);
  useSaveSession({ mrzValid, mrzMessage }, isRehydrating, [
    mrzValid,
    mrzMessage,
  ]);
  useSaveSession({ faceMatch }, isRehydrating, [faceMatch]);

  // ── Payload ───────────────────────────────────────────────────────────────
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
        signatureImage,
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
      signatureImage,
      documentQuality,
      fields,
      mrzValid,
      mrzMessage,
      faceMatch,
    ],
  );

  const backendPayload = useMemo(
    () => transformToBackendPayload(internalPayload, loadSession()?.msisdn ?? msisdn, docType),
    [internalPayload, msisdn, docType],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const token = getStoredToken();
    if (!token) throw new Error("Session expired. Please re-verify your phone number.");
    const response = await apiSubmitSIMRegistration(backendPayload, token);
    if (response.StatusCode !== 200 || response.Status !== "successful") {
      throw new Error(response.StatusDescription || "Submission failed. Please try again.");
    }
    clearSession();
    clearOTP();
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () =>
    resetFlow(() => {
      resetSelfie();
      resetDocument();
      resetOCR();
      resetFaceMatch();
      resetLiveness();
      setMsisdn("");
      setSignatureImageState("");
      setDocType("");
    });

  // ── Export payload ────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex justify-center items-center min-h-screen text-slate-100">
      {/* Fixed background — always viewport-sized, never zooms with content */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgOkapi})` }}
      />
      <div className="w-full flex flex-col gap-5 max-w-3xl mx-auto px-4 py-6">
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Header modelsLoaded={modelsLoaded} activeStepLabel={activeStep.label} />
          {/* <LanguageSwitcher timers={timers} /> */}
           <LanguageSwitcher />
        </div>

        <Stepper
          steps={steps}
          stepIndex={stepIndex}
          maxStepReached={maxStepReached}
          onStepClick={goToStep}
        />


        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-sm p-6 shadow-2xl shadow-black/40">
            {activeStep.key === "msisdn" && (
              <MSISDNStep
                msisdn={msisdn}
                setMsisdn={setMsisdn}
                nextStep={nextStep}
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
                retakeSelfie={() => {
                  resetSelfie();
                  resetLiveness();
                }}
                captureStatus={captureStatus}
              />
            )}

            {activeStep.key === "signature" && (
              <SignatureStep
                signatureImage={signatureImage}
                setSignatureImage={setSignatureImage}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {activeStep.key === "document" && (
              <DocumentStep
                docType={docType}
                setDocType={(v) => { setDocType(v); resetDocument(); }}
                documentPreviewMode={documentPreviewMode}
                setDocumentPreviewMode={setDocumentPreviewMode}
                docWebcamRef={docWebcamRef}
                captureDocument={captureDocument}
                captureDocumentBack={captureDocumentBack}
                handleDocumentUpload={handleDocumentUpload}
                handleDocumentBackUpload={handleDocumentBackUpload}
                handleDocumentDropFile={handleDocumentDropFile}
                handleDocumentBackDropFile={handleDocumentBackDropFile}
                documentUploading={documentUploading}
                documentBackUploading={documentBackUploading}
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
                docType={docType}
              />
            )}

            {activeStep.key === "match" && (
              <FaceMatchStep
                selfieImage={selfieImage}
                documentImage={documentImage}
                faceMatch={faceMatch}
                prevStep={prevStep}
                onSubmit={handleSubmit}
                onReset={handleReset}
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

      {/* Fixed error toast — always visible regardless of scroll position */}
      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 animate-[slideUp_0.2s_ease-out]">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/50 bg-slate-900 px-4 py-3.5 shadow-2xl shadow-black/60 ring-1 ring-rose-500/20">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="flex-1 text-sm leading-snug text-slate-100">{error.message}</p>
            <button
              onClick={clearError}
              className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-slate-300"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
