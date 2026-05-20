import { Check, RotateCcw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LivenessPhase } from "../../../../hooks/useFaceLiveness";
import type { CaptureStatus } from "../../../../hooks/useSelfie";

interface StatusBannerProps {
  phase:        LivenessPhase;
  capturePhase: CaptureStatus["phase"];
  countdown:    number;
  faceDetected: boolean;
  qualityOk:    boolean;
  hint:         string;
}

export function StatusBanner({
  phase,
  capturePhase,
  countdown,
  faceDetected,
  qualityOk,
  hint,
}: StatusBannerProps) {
  const { t } = useTranslation();

  if (capturePhase === "front-guide") {
    if (!faceDetected) return (
      <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <p className="text-sm text-slate-300">{t("banner_position")}</p>
      </div>
    );
    if (!qualityOk) return (
      <div className="flex items-center gap-3 rounded-2xl bg-amber-950/60 border border-amber-700/50 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <p className="text-sm text-amber-200">{t("banner_closer")}</p>
      </div>
    );
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-cyan-950/60 border border-cyan-700/50 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
        <p className="text-sm text-cyan-200">{t("banner_hold")}</p>
      </div>
    );
  }

  if (capturePhase === "front-countdown") return (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-950/60 border border-amber-600/60 px-4 py-3">
      <div className="text-amber-400 text-lg font-bold shrink-0">{countdown}</div>
      <p className="text-sm text-amber-200 font-medium">
        {t("banner_countdown", { count: countdown })}
      </p>
    </div>
  );

  if (capturePhase === "front-captured") return (
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
      <Check size={18} className="text-emerald-400 shrink-0" />
      <p className="text-sm text-emerald-200 font-medium">{t("banner_front_captured")}</p>
    </div>
  );

  if (capturePhase === "side-guide") return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3">
      <RotateCcw size={22} className="text-slate-300 shrink-0" />
      <div>
        <p className="text-sm text-white font-medium">{t("banner_side_title")}</p>
        <p className="text-xs text-slate-400 mt-0.5">{t("banner_side_hint")}</p>
      </div>
    </div>
  );

  if (capturePhase === "side-ready") return (
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
      <Check size={18} className="text-emerald-400 shrink-0" />
      <p className="text-sm text-emerald-200 font-medium">{t("banner_side_ready")}</p>
    </div>
  );

  if (capturePhase === "side-captured" || capturePhase === "complete") return (
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
      <Sparkles size={18} className="text-emerald-400 shrink-0" />
      <p className="text-sm text-emerald-200 font-medium">{t("banner_all_captured")}</p>
    </div>
  );

  void phase;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3">
      <div className={`w-2 h-2 rounded-full shrink-0 ${faceDetected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
      <p className="text-sm text-slate-300 truncate">{hint}</p>
    </div>
  );
}
