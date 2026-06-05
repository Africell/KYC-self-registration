import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LivenessPhase } from "../../../../hooks/useFaceLiveness";
import type { CaptureStatus } from "../../../../hooks/useSelfie";

interface StatusBannerProps {
  phase: LivenessPhase;
  capturePhase: CaptureStatus["phase"];
  countdown: number;
  faceDetected: boolean;
  qualityOk: boolean;
  hint: string;
}

export function StatusBanner({
  phase,
  capturePhase,
  countdown,
  faceDetected,
  // qualityOk,
  hint,
}: StatusBannerProps) {
  const { t } = useTranslation();

  if (capturePhase === "front-countdown")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-amber-950/60 border border-amber-600/60 px-4 py-3">
        <div className="text-amber-400 text-lg font-bold shrink-0">
          {countdown}
        </div>
        <p className="text-sm text-amber-200 font-medium">
          {t("banner_countdown", { count: countdown })}
        </p>
      </div>
    );

  if (capturePhase === "front-captured")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
        <Check size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-200 font-medium">
          {t("banner_front_captured")}
        </p>
      </div>
    );

  if (capturePhase === "side-ready")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
        <div className="text-emerald-400 text-lg font-bold shrink-0">
          {countdown}
        </div>
        <p className="text-sm text-emerald-200 font-medium">
          {t("banner_side_countdown", { count: countdown })}
        </p>
      </div>
    );

  if (capturePhase === "review")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
        <Sparkles size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-200 font-medium">
          {t("banner_review")}
        </p>
      </div>
    );

  if (capturePhase === "side-captured" || capturePhase === "complete")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 px-4 py-3">
        <Sparkles size={18} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-200 font-medium">
          {t("banner_all_captured")}
        </p>
      </div>
    );

  void phase;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${faceDetected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
      />
      <p className="text-sm text-slate-300 truncate">{hint}</p>
    </div>
  );
}
