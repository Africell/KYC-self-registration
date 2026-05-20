import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ConsentStepProps {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  nextStep: () => void;
  modelsLoaded: boolean;
}

export default function ConsentStep({ agreed, setAgreed, nextStep, modelsLoaded }: ConsentStepProps) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(agreed);

  function handleContinue() {
    setAgreed(true);
    nextStep();
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{t("consent_title")}</h2>
      </div>

      <div className="space-y-3 text-sm leading-6 text-slate-400">
        <p>{t("consent_desc_1")}</p>
        <p>{t("consent_desc_2")}</p>
      </div>

      <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-all ${checked ? "border-cyan-500/40 bg-cyan-500/5 text-slate-100" : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600"}`}>
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${checked ? "border-cyan-500 bg-cyan-500" : "border-slate-600 bg-slate-800"}`}>
          {checked && (
            <svg className="h-3 w-3 text-slate-950" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="sr-only" />
        <span>{t("consent_checkbox")}</span>
      </label>

      {!modelsLoaded && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-300">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin shrink-0" />
          {t("consent_models_loading")}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!checked || !modelsLoaded}
        className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("continue")}
      </button>
    </section>
  );
}
