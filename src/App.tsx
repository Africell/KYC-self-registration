// src/App.tsx
//
// Orchestrates the 7-step KYC self-registration flow per requirements:
//   msisdn → form → document → selfie → signature → consent → acknowledgment

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Webcam from "react-webcam";

import { useKYCFlow } from "./hooks/useKYCFlow";
import { useSessionTimers } from "./hooks/useSessionTimers";
import { useDocument } from "./hooks/useDocument";
import { useOCR } from "./hooks/useOCR";

import { buildPayload } from "./lib/services/payload.service";
import {
  loadSession,
  saveSession,
  startExpiryWatcher,
} from "./lib/services/session.service";
import { apiSubmitSIMRegistration } from "./lib/api/kyc.api";
import { getStoredToken } from "./lib/services/msisdn.service";
import {
  docVideoConstraints,
  steps,
} from "./lib/constants/kyc.constants";

import Header from "./components/layout/Header";
import Stepper from "./components/layout/Stepper";
import MSISDNStep from "./components/steps/MSISDNStep";
import OCRStep from "./components/steps/OCRStep";
import DocumentStep from "./components/steps/document/DocumentStep";
import SelfieVideoStep from "./components/steps/SelfieVideoStep";
import SignatureStep from "./components/steps/Signaturestep";
import ConsentStep from "./components/steps/ConsentStep";
import AcknowledgmentStep from "./components/steps/AcknowledgmentStep";
import { LanguageSwitcher } from "./components/layout/LanguageSwitcher";

import { transformToBackendPayload } from "./utils/image";
import type { SessionPatch } from "./lib/services/session.service";

// ── Auto-save helper ──────────────────────────────────────────────────────────

function useSaveSession(
  patch: SessionPatch,
  isRehydrating: React.RefObject<boolean>,
  deps: unknown[],
) {
  useEffect(() => {
    if (isRehydrating.current) return;
    saveSession(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const docWebcamRef = useRef<Webcam | null>(null);
  const isRehydrating = useRef(true);

  // ── Flow ──────────────────────────────────────────────────────────────────
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

  // ── Session timers ────────────────────────────────────────────────────────
  const timers = useSessionTimers();

  // ── MSISDN ────────────────────────────────────────────────────────────────
  const [msisdn, setMsisdn] = useState("");

  // ── Selfie video — in-memory only, not persisted to localStorage ──────────
  const [selfieVideoBlob, setSelfieVideoBlob] = useState<Blob | null>(null);
  const [selfieVideoUrl, setSelfieVideoUrl] = useState("");

  const setSelfieVideo = (blob: Blob | null, url: string) => {
    setSelfieVideoBlob(blob);
    setSelfieVideoUrl(url);
    saveSession({ selfieVideoCaptured: !!blob });
  };

  // ── Signature ─────────────────────────────────────────────────────────────
  const [signatureImage, setSignatureImageState] = useState("");

  const setSignatureImage = (dataUrl: string) => {
    setSignatureImageState(dataUrl);
    saveSession({ signatureImage: dataUrl });
  };

  // ── Registration reference ────────────────────────────────────────────────
  const [registrationReference, setRegistrationReference] = useState("");

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
    saveDocumentBlobLocally,
    saveDocumentBackBlobLocally,
    rehydrateDocument,
    resetDocument,
  } = useDocument({ docWebcamRef, pushError, clearError });

  // ── OCR (optional — pre-fills form fields when document is captured) ──────
  const {
    fields,
    setFields,
    mrzValid,
    mrzMessage,
    rehydrateOCR,
    resetOCR,
  } = useOCR({ documentImage, pushError, clearError, nextStep: () => {} });

  // ── Rehydration ───────────────────────────────────────────────────────────
  useEffect(() => {
    const s = loadSession();

    if (s) {
      if (s.msisdn) setMsisdn(s.msisdn);
      if (s.signatureImage) setSignatureImageState(s.signatureImage);
      if (s.registrationReference) setRegistrationReference(s.registrationReference);

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
    }

    requestAnimationFrame(() => {
      isRehydrating.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // ── Expiry watcher ────────────────────────────────────────────────────────
  useEffect(() => startExpiryWatcher(), []);

  // ── Auto-save watchers ────────────────────────────────────────────────────
  useSaveSession({ msisdn }, isRehydrating, [msisdn]);
  useSaveSession({ documentImage }, isRehydrating, [documentImage]);
  useSaveSession({ documentBackImage }, isRehydrating, [documentBackImage]);
  useSaveSession({ documentQuality }, isRehydrating, [documentQuality]);
  useSaveSession({ documentBackQuality }, isRehydrating, [documentBackQuality]);
  useSaveSession({ fields }, isRehydrating, [fields]);
  useSaveSession({ mrzValid, mrzMessage }, isRehydrating, [mrzValid, mrzMessage]);
  useSaveSession({ registrationReference }, isRehydrating, [registrationReference]);

  // ── Payload ───────────────────────────────────────────────────────────────
  const internalPayload = useMemo(
    () =>
      buildPayload({
        consentAccepted: agreed,
        selfieVideoRef: selfieVideoUrl,
        documentImage,
        documentBackImage,
        signatureImage,
        documentQuality,
        fields,
        mrzValid,
        mrzMessage,
        registrationReference,
      }),
    [
      agreed,
      selfieVideoUrl,
      documentImage,
      documentBackImage,
      signatureImage,
      documentQuality,
      fields,
      mrzValid,
      mrzMessage,
      registrationReference,
    ],
  );

  const backendPayload = useMemo(
    () => transformToBackendPayload(internalPayload, msisdn),
    [internalPayload, msisdn],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitLoading(true);

    try {
      const token = getStoredToken();
      if (!token) throw new Error("Session expired. Please verify your number again.");

      const response = await apiSubmitSIMRegistration(backendPayload, token);

      // Extract reference from response if available
      const ref =
        (response as { Data?: { RegistrationReference?: string } })?.Data
          ?.RegistrationReference ??
        `REG-${Date.now()}`;

      setRegistrationReference(ref);
      saveSession({ registrationReference: ref });
      nextStep();
    } catch (err) {
      console.error("[App] Submission error:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () =>
    resetFlow(() => {
      resetDocument();
      resetOCR();
      setMsisdn("");
      setSignatureImageState("");
      setSelfieVideoBlob(null);
      setSelfieVideoUrl("");
      setRegistrationReference("");
      setSubmitError("");
    });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-20 bg-[#a11775] flex justify-center flex-col text-slate-100">
      <LanguageSwitcher timers={timers} />

      <div className="mx-auto max-w-7xl flex flex-col justify-center sm:py-10 py-3">
        <Header
          modelsLoaded={true}
          activeStepLabel={activeStep.label}
        />
        <Stepper steps={steps} stepIndex={stepIndex} />

        {error && (
          <div className="mb-6 rounded-2xl border border-[#ee7d00] bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <strong className="mr-2 uppercase tracking-wide">{error.scope}</strong>
            {error.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] w-full">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">

            {/* Step 1: Mobile number + OTP */}
            {activeStep.key === "msisdn" && (
              <MSISDNStep
                msisdn={msisdn}
                setMsisdn={setMsisdn}
                nextStep={nextStep}
              />
            )}

            {/* Step 2: KYC details form */}
            {activeStep.key === "form" && (
              <OCRStep
                fields={fields}
                setFields={setFields}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {/* Step 3: ID photo capture */}
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
                nextStep={nextStep}
                prevStep={prevStep}
                docVideoConstraints={docVideoConstraints}
                documentQuality={documentQuality}
                documentBackQuality={documentBackQuality}
                saveDocumentBlobLocally={saveDocumentBlobLocally}
                saveDocumentBackBlobLocally={saveDocumentBackBlobLocally}
              />
            )}

            {/* Step 4: Liveness selfie video */}
            {activeStep.key === "selfie" && (
              <SelfieVideoStep
                selfieVideoBlob={selfieVideoBlob}
                selfieVideoUrl={selfieVideoUrl}
                setSelfieVideo={setSelfieVideo}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {/* Step 5: Signature photo */}
            {activeStep.key === "signature" && (
              <SignatureStep
                signatureImage={signatureImage}
                setSignatureImage={setSignatureImage}
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}

            {/* Step 6: Consent and submit */}
            {activeStep.key === "consent" && (
              <ConsentStep
                agreed={agreed}
                setAgreed={setAgreed}
                onSubmit={handleSubmit}
                prevStep={prevStep}
                submitLoading={submitLoading}
                submitError={submitError}
              />
            )}

            {/* Step 7: Acknowledgment */}
            {activeStep.key === "acknowledgment" && (
              <AcknowledgmentStep
                msisdn={msisdn}
                registrationReference={registrationReference}
                resetFlow={handleReset}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
