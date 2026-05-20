import { useTranslation } from "react-i18next";
import type { DocumentQuality } from "../../../types/kyc";

interface QualityPanelProps {
  quality: DocumentQuality | null;
}

function Bar({ value, max = 255 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct > 60 ? "bg-emerald-400" : pct > 30 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-700">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetricRow({ label, value, max }: { label: string; value: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-slate-200">{value}</span>
      </div>
      <Bar value={value} max={max} />
    </div>
  );
}

export function QualityPanel({ quality }: QualityPanelProps) {
  const { t } = useTranslation();

  if (!quality) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-center">
        <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        <p className="text-xs text-slate-500">{t("quality_empty")}</p>
      </div>
    );
  }

  const ok = quality.looksUsefulForOCR;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
      {/* Verdict badge */}
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${ok ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"}`}>
        {ok ? (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
        {ok ? t("quality_good") : t("quality_needs_improvement")}
      </div>

      {/* Resolution */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{t("quality_resolution")}</span>
        <span className="font-medium tabular-nums text-slate-200">{quality.width} × {quality.height}</span>
      </div>

      {/* Metric bars */}
      <div className="space-y-3">
        <MetricRow label={t("quality_brightness")} value={quality.brightness} max={255} />
        <MetricRow label={t("quality_contrast")}   value={quality.contrast}   max={255} />
        <MetricRow label={t("quality_blur")}        value={quality.blurScore}  max={100} />
        <MetricRow label={t("quality_glare")}       value={Math.round(quality.glareRatio * 100)} max={100} />
      </div>

      {/* Reasons */}
      {quality.reasons.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-slate-800/60 p-3">
          {quality.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-xs text-amber-200">
              <span className="mt-0.5 shrink-0 text-amber-400">•</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
