import { useTranslation } from "react-i18next";
import Webcam from "react-webcam";
import { QualityPanel } from "./QualityPanel";
import type { DocumentQuality } from "../../../types/kyc";

const DOC_TYPE_KEY_MAP: Record<string, string> = {
  passport:        "doc_passport",
  national_id:     "doc_national_id",
  drivers_license: "doc_drivers",
};

interface DocumentSideProps {
  side:                "front" | "back";
  docType:             string;
  previewMode:         "camera" | "upload";
  docWebcamRef:        React.RefObject<Webcam | null>;
  docVideoConstraints: MediaTrackConstraints;
  image:               string;
  quality:             DocumentQuality | null;
  onCapture:           () => void;
  onUpload:            (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload:          () => void;
}

export function DocumentSide({
  side,
  docType,
  previewMode,
  docWebcamRef,
  docVideoConstraints,
  image,
  quality,
  onCapture,
  onUpload,
  onDownload,
}: DocumentSideProps) {
  const { t } = useTranslation();

  const isFront      = side === "front";
  const heading      = t(isFront ? "side_front_heading" : "side_back_heading");
  const captureLabel = t(isFront ? "side_front_capture" : "side_back_capture");
  const previewLabel = t(isFront ? "side_front_preview" : "side_back_preview");
  const downloadLabel = t(isFront ? "side_download_front" : "side_download_back");
  const docLabel     = t(DOC_TYPE_KEY_MAP[docType] ?? "doc_passport");

  return (
    <div className="space-y-4">
      {/* Side label */}
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isFront ? "bg-cyan-500 text-slate-950" : "bg-violet-500 text-white"}`}>
          {isFront ? "1" : "2"}
        </span>
        <h3 className="text-sm font-semibold text-slate-200">{heading}</h3>
        {image && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {t("side_captured")}
          </span>
        )}
      </div>

      {/* Input area */}
      {previewMode === "camera" ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
          <Webcam
            ref={docWebcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={docVideoConstraints}
            className="aspect-video w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[70%] w-[85%] rounded-xl border-2 border-dashed border-white/40" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60">
            {t("side_align")}
          </p>
        </div>
      ) : (
        <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center transition-colors hover:border-cyan-500/50 hover:bg-slate-900/60">
          <svg className="h-10 w-10 text-slate-500 transition-colors group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300">
              {t("side_upload_prompt", { side: heading, docType: docLabel })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("side_upload_note")}</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}

      {/* Preview + quality panel */}
      {image && (
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium text-slate-400">{previewLabel}</p>
            <img
              src={image}
              alt={heading}
              className="w-full rounded-xl object-contain"
            />
          </div>
          <QualityPanel quality={quality} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {previewMode === "camera" && (
          <button
            onClick={onCapture}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 border border-slate-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            {captureLabel}
          </button>
        )}
        <button
          onClick={onDownload}
          disabled={!image}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}
