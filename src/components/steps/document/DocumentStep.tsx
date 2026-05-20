// src/components/steps/document/DocumentStep.tsx

import Webcam from "react-webcam";
import type { DocumentQuality } from "../../../types/kyc";
import { cx } from "../../../lib/utils";
import { DocumentSide } from "./DocumentSide";
import passportSample from "../../../assets/passport-sample.png";

const DOC_TYPES = [
  {
    id: "passport",
    label: "Passport",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    hint: "Open to the photo/data page. Ensure the MRZ (two lines at the bottom) is fully visible.",
    sides: 1,
  },
  {
    id: "national_id",
    label: "National ID",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
    hint: "Capture the front side first, then the back. Make sure all four corners are visible.",
    sides: 2,
  },
  {
    id: "drivers_license",
    label: "Driver's License",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    hint: "Capture the front side first, then the back. Hold the card flat to avoid glare.",
    sides: 2,
  },
] as const;

interface DocumentStepProps {
  docType:                     string;
  setDocType:                  (v: string) => void;
  documentPreviewMode:         "camera" | "upload";
  setDocumentPreviewMode:      (mode: "camera" | "upload") => void;
  docWebcamRef:                React.RefObject<Webcam | null>;
  docVideoConstraints:         MediaTrackConstraints;
  documentImage:               string;
  documentQuality:             DocumentQuality | null;
  documentBackImage:           string;
  documentBackQuality:         DocumentQuality | null;
  captureDocument:             () => Promise<void>;
  captureDocumentBack:         () => Promise<void>;
  handleDocumentUpload:        (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDocumentBackUpload:    (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  saveDocumentBlobLocally:     () => Promise<void>;
  saveDocumentBackBlobLocally: () => Promise<void>;
  runOCRAndMRZ:                () => Promise<void>;
  prevStep:                    () => void;
  busy:                        boolean;
}

export default function DocumentStep({
  docType,
  setDocType,
  documentPreviewMode,
  setDocumentPreviewMode,
  docWebcamRef,
  docVideoConstraints,
  documentImage,
  documentQuality,
  documentBackImage,
  documentBackQuality,
  captureDocument,
  captureDocumentBack,
  handleDocumentUpload,
  handleDocumentBackUpload,
  saveDocumentBlobLocally,
  saveDocumentBackBlobLocally,
  runOCRAndMRZ,
  prevStep,
  busy,
}: DocumentStepProps) {
  const selectedDoc = DOC_TYPES.find((d) => d.id === docType);
  const docTypeSelected = !!docType;
  const needsBack = selectedDoc && selectedDoc.sides === 2;
  const canProceed = docTypeSelected && !!documentImage && (!needsBack || !!documentBackImage);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Document capture</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose your document type, then capture or upload clear photos.
        </p>
      </div>

      {/* Document type selector */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Document type <span className="text-rose-400">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DOC_TYPES.map((doc) => {
            const selected = docType === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setDocType(doc.id)}
                className={cx(
                  "flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center text-sm transition-all duration-200",
                  selected
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-100 shadow-md shadow-cyan-500/10 scale-[1.02]"
                    : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60",
                )}
              >
                <span className={cx("transition-colors", selected ? "text-cyan-300" : "text-slate-400")}>
                  {doc.icon}
                </span>
                <span className="font-medium leading-tight text-xs sm:text-sm">{doc.label}</span>
                {selected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-slate-950">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {selectedDoc && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            {selectedDoc.hint}
          </div>
        )}

        {/* Passport guide */}
        {docType === "passport" && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
            <div className="border-b border-slate-700 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">How to capture your passport</p>
            </div>
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              <img
                src={passportSample}
                alt="Passport sample"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 object-contain sm:w-48"
              />
              <ol className="flex flex-col gap-2 text-sm text-slate-300">
                {[
                  "Open your passport to the photo/data page.",
                  "Place it flat on a well-lit, dark surface.",
                  "All four corners of the page must be visible.",
                  "Ensure the MRZ (two lines at the bottom) is fully readable.",
                  "Avoid glare, shadows, or obstructions.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-400 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Capture UI */}
      {docTypeSelected && (
        <>
          {/* Mode toggle */}
          <div className="flex overflow-hidden rounded-xl border border-slate-700 w-fit">
            {(["camera", "upload"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDocumentPreviewMode(mode)}
                className={cx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  documentPreviewMode === mode
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-900/60 text-slate-300 hover:bg-slate-800",
                )}
              >
                {mode === "camera" ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    Camera
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Upload
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Front side */}
          <DocumentSide
            side="front"
            docType={docType}
            previewMode={documentPreviewMode}
            docWebcamRef={docWebcamRef}
            docVideoConstraints={docVideoConstraints}
            image={documentImage}
            quality={documentQuality}
            onCapture={() => void captureDocument()}
            onUpload={(e) => void handleDocumentUpload(e)}
            onDownload={() => void saveDocumentBlobLocally()}
          />

          {/* Back side — revealed after front is captured */}
          {documentImage && needsBack && (
            <div className="border-t border-slate-700/60 pt-5">
              <DocumentSide
                side="back"
                docType={docType}
                previewMode={documentPreviewMode}
                docWebcamRef={docWebcamRef}
                docVideoConstraints={docVideoConstraints}
                image={documentBackImage}
                quality={documentBackQuality}
                onCapture={() => void captureDocumentBack()}
                onUpload={(e) => void handleDocumentBackUpload(e)}
                onDownload={() => void saveDocumentBackBlobLocally()}
              />
            </div>
          )}

          {/* Progress chips */}
          {needsBack && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={cx("flex items-center gap-1", documentImage ? "text-emerald-400" : "text-slate-500")}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  {documentImage
                    ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  }
                </svg>
                Front captured
              </span>
              <span className="text-slate-600">•</span>
              <span className={cx("flex items-center gap-1", documentBackImage ? "text-emerald-400" : "text-slate-500")}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  {documentBackImage
                    ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  }
                </svg>
                Back captured
              </span>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-5">
        <button
          onClick={prevStep}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <button
          onClick={() => void runOCRAndMRZ()}
          disabled={!canProceed || busy}
          title={!docTypeSelected ? "Select a document type first" : !documentImage ? "Capture the front side first" : needsBack && !documentBackImage ? "Capture the back side too" : undefined}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              Running OCR…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
              Run OCR & MRZ
            </>
          )}
        </button>

        {!canProceed && docTypeSelected && (
          <p className="text-xs text-slate-500">
            {!documentImage
              ? "Capture or upload the front side to continue."
              : needsBack && !documentBackImage
              ? "Capture or upload the back side to continue."
              : ""}
          </p>
        )}
      </div>
    </section>
  );
}
