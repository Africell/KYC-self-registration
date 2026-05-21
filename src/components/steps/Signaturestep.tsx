import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SignatureCanvas from "react-signature-canvas";

const MAX_FILE_MB    = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

interface SignatureStepProps {
  signatureImage: string;
  setSignatureImage: (dataUrl: string) => void;
  nextStep: () => void;
  prevStep: () => void;
}

function trimmedDataUrl(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;
  let top = height, bottom = 0, left = width, right = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (px[(y * width + x) * 4 + 3] > 0) {
        if (y < top)    top    = y;
        if (y > bottom) bottom = y;
        if (x < left)   left   = x;
        if (x > right)  right  = x;
      }
    }
  }
  if (top > bottom || left > right) return canvas.toDataURL("image/png");
  const pad = 10;
  const out = document.createElement("canvas");
  out.width  = right  - left + 1 + pad * 2;
  out.height = bottom - top  + 1 + pad * 2;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "white";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas, left - pad, top - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(String(r.result ?? ""));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function SignatureStep({
  signatureImage,
  setSignatureImage,
  nextStep,
  prevStep,
}: SignatureStepProps) {
  const { t } = useTranslation();
  const fileRef               = useRef<HTMLInputElement>(null);
  const sigCanvasRef          = useRef<SignatureCanvas>(null);
  const [tab, setTab]         = useState<"upload" | "draw">("upload");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [error, setError]     = useState("");
  const [hint, setHint]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setHint("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t("sig_error_type"));
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(t("sig_error_size", { max: MAX_FILE_MB }));
      e.target.value = "";
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    const img     = new Image();
    img.onload = () => {
      if (img.naturalWidth < 200 || img.naturalHeight < 80) {
        setHint(t("sig_hint_small"));
      }
      setSignatureImage(dataUrl);
    };
    img.src        = dataUrl;
    e.target.value = "";
  };

  const handleRetake = () => {
    setSignatureImage("");
    setError("");
    setHint("");
    setHasDrawn(false);
    sigCanvasRef.current?.clear();
  };

  const handleNext = () => {
    setSubmitted(true);
    if (!signatureImage) {
    
      if (tab === "draw" && hasDrawn && sigCanvasRef.current) {
        const dataUrl = trimmedDataUrl(sigCanvasRef.current.getCanvas());
       
        setSignatureImage(dataUrl);
        nextStep();
        return;
      }
      setError(t("sig_error_required"));
      return;
    }
    nextStep();
  };

  return (
    <section className="space-y-6">

      <div>
        <h2 className="text-2xl font-semibold">{t("sig_title")}</h2>
        <p className="mt-1 text-sm text-slate-300">
          {t("sig_subtitle", { max: MAX_FILE_MB })}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">

        {signatureImage ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-600/40 bg-slate-900 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-emerald-400">
                {t("sig_captured")}
              </p>
              <img
                src={signatureImage}
                alt={t("sig_title")}
                className="max-h-48 w-full rounded-xl object-contain bg-white p-2"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRetake}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t("sig_retake")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex rounded-xl bg-slate-900 p-1 gap-1">
              <button
                onClick={() => { setTab("upload"); setError(""); setHasDrawn(false); sigCanvasRef.current?.clear(); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
                  ${tab === "upload"
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t("sig_tab_upload")}
              </button>
              <button
                onClick={() => { setTab("draw"); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors
                  ${tab === "draw"
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t("sig_tab_draw")}
              </button>
            </div>

            {/* Upload tab */}
            {tab === "upload" && (
              <button
                onClick={() => fileRef.current?.click()}
                className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors
                  ${submitted && !signatureImage
                    ? "border-rose-500 bg-rose-500/5 hover:border-rose-400"
                    : "border-slate-700 hover:border-slate-500 hover:bg-slate-900"
                  }`}
              >
                <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <div>
                  <p className="text-base font-medium text-slate-200">
                    {t("sig_upload_title")}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {t("sig_upload_note", { max: MAX_FILE_MB })}
                  </p>
                </div>
              </button>
            )}

            {/* Draw tab */}
            {tab === "draw" && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{t("sig_draw_title")}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t("sig_draw_note")}</p>
                </div>
                <div className={`rounded-2xl border-2 overflow-hidden
                  ${submitted && !signatureImage ? "border-rose-500" : "border-slate-700"}`}
                >
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#1e293b"
                    onEnd={() => setHasDrawn(true)}
                    canvasProps={{
                      className: "w-full bg-white",
                      style: { height: 180, display: "block" },
                    }}
                  />
                </div>
                <button
                  onClick={() => { sigCanvasRef.current?.clear(); setError(""); }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {t("sig_draw_clear")}
                </button>
              </div>
            )}
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => void handleFile(e)}
        />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("sig_tips_title")}</p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• {t("sig_tip_1")}</li>
            <li>• {t("sig_tip_2")}</li>
            <li>• {t("sig_tip_3")}</li>
            <li>• {t("sig_tip_4")}</li>
          </ul>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-700/50 bg-rose-900/20 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300">
          ⚠ {hint}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
        <button
          onClick={prevStep}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {t("back")}
        </button>
        <button
          onClick={handleNext}
          className="rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 hover:bg-cyan-400 transition-colors"
        >
          {tab === "draw" && hasDrawn && !signatureImage ? t("sig_trim_continue") : t("continue")}
        </button>
      </div>
    </section>
  );
}
