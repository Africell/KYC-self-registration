import { useEffect, useRef, useState } from "react";
import type { FaceMatchResult } from "../../types/kyc";
import * as faceapi from "face-api.js";
import { dataUrlToImage } from "../../utils/image";

type Props = {
  selfieImage: string;
  documentImage: string;
  faceMatch: FaceMatchResult | null;
  prevStep: () => void;
  nextStep: () => void;
};

async function buildDebugCrops(
  selfieDataUrl: string,
  docDataUrl: string,
): Promise<{ selfie: string; doc: string; selfieBox: string; docBox: string }> {
  const [selfieImg, docImg] = await Promise.all([
    dataUrlToImage(selfieDataUrl),
    dataUrlToImage(docDataUrl),
  ]);

  async function cropFor(img: HTMLImageElement, label: string): Promise<{ cropped: string; boxInfo: string }> {
    const SIZE = 224;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    let box: faceapi.Box | null = null;
    let detector = "none";

    if (faceapi.nets.ssdMobilenetv1.isLoaded) {
      const det = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 })).withFaceLandmarks();
      if (det) { box = det.detection.box; detector = "SSD"; }
    }

    if (!box) {
      const det = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })).withFaceLandmarks();
      if (det) { box = det.detection.box; detector = "Tiny"; }
    }

    if (!box) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      return { cropped: canvas.toDataURL("image/jpeg", 0.92), boxInfo: `${label}: ❌ NO FACE DETECTED (${img.naturalWidth}×${img.naturalHeight})` };
    }

    const pad = Math.max(box.width, box.height) * 0.3;
    const x = Math.max(0, box.x - pad);
    const y = Math.max(0, box.y - pad);
    const w = Math.min(img.naturalWidth - x, box.width + pad * 2);
    const h = Math.min(img.naturalHeight - y, box.height + pad * 2);
    canvas.width = SIZE; canvas.height = SIZE;
    ctx.drawImage(img, x, y, w, h, 0, 0, SIZE, SIZE);

    return { cropped: canvas.toDataURL("image/jpeg", 0.92), boxInfo: `${label}: ✅ ${detector} | box (${Math.round(box.x)},${Math.round(box.y)}) ${Math.round(box.width)}×${Math.round(box.height)} | src ${img.naturalWidth}×${img.naturalHeight}` };
  }

  const [selfieResult, docResult] = await Promise.all([cropFor(selfieImg, "Selfie"), cropFor(docImg, "Document")]);
  return { selfie: selfieResult.cropped, doc: docResult.cropped, selfieBox: selfieResult.boxInfo, docBox: docResult.boxInfo };
}

export default function FaceMatchStep({ selfieImage, documentImage, faceMatch, prevStep, nextStep }: Props) {
  const [debugCrops, setDebugCrops] = useState<{ selfie: string; doc: string; selfieBox: string; docBox: string } | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (!selfieImage || !documentImage || didRun.current) return;
    didRun.current = true;
    setDebugLoading(true);
    buildDebugCrops(selfieImage, documentImage).then(setDebugCrops).catch(console.error).finally(() => setDebugLoading(false));
  }, [selfieImage, documentImage]);

  const passed = faceMatch?.passed;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Face match result</h2>
        <p className="mt-1 text-sm text-slate-400">
          Your selfie is compared against your document photo using on-device face recognition.
        </p>
      </div>

      {/* Images */}
      <div className="grid gap-3 grid-cols-2">
        {[
          { label: "Selfie", src: selfieImage, alt: "Selfie" },
          { label: "Document photo", src: documentImage, alt: "Document" },
        ].map(({ label, src, alt }) => (
          <div key={label} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>
            {src
              ? <img src={src} alt={alt} className="w-full rounded-xl object-cover aspect-3/4" />
              : <div className="flex aspect-3/4 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-500">No image</div>
            }
          </div>
        ))}
      </div>

      {/* Decision */}
      {faceMatch ? (
        <div className={`rounded-2xl border p-4 ${passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className="mb-3 flex items-center gap-2">
            {passed ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Match passed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Review needed
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Similarity", value: `${faceMatch.similarity}%` },
              { label: "Distance", value: String(faceMatch.distance) },
              { label: "Threshold", value: String(faceMatch.threshold) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-slate-900/60 px-3 py-3">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-cyan-300 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-500">
          No match result yet.
        </div>
      )}

      {/* Debug — collapsed by default */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40">
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span className="uppercase tracking-wide font-medium">Debug: face-api crop view</span>
          <svg className={`h-4 w-4 transition-transform ${showDebug ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showDebug && (
          <div className="border-t border-slate-700/50 p-4 space-y-3">
            {debugLoading && <p className="text-xs text-amber-300 animate-pulse">Running crop detection…</p>}
            {debugCrops && (
              <>
                <div className="grid gap-3 grid-cols-2">
                  {[
                    { label: "Selfie crop (224×224)", src: debugCrops.selfie, alt: "Selfie crop" },
                    { label: "Document crop (224×224)", src: debugCrops.doc, alt: "Document crop" },
                  ].map(({ label, src, alt }) => (
                    <div key={label} className="rounded-xl bg-slate-900 p-2">
                      <p className="mb-1.5 text-xs text-slate-500">{label}</p>
                      <img src={src} alt={alt} className="w-full rounded-lg" style={{ imageRendering: "pixelated" }} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {[debugCrops.selfieBox, debugCrops.docBox].map((info) => (
                    <div key={info} className={`rounded-lg px-3 py-2 text-xs font-mono ${info.includes("❌") ? "bg-red-950 text-red-300" : "bg-slate-900 text-emerald-300"}`}>
                      {info}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-700/60 pt-4">
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
          onClick={nextStep}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </section>
  );
}
