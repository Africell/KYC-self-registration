import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ConsentStepProps {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  nextStep: () => void;
  modelsLoaded: boolean;
}

export default function ConsentStep({
  agreed,
  setAgreed,
  nextStep,
  modelsLoaded,
}: ConsentStepProps) {
  const { t } = useTranslation();
  // Local checkbox state — only committed to the session when Continue is clicked.
  const [checked, setChecked] = useState(agreed);

  function handleContinue() {
    setAgreed(true);
    nextStep();
  }

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-semibold">
        {t("consent_title")}
      </h2>

      <div className="space-y-4 text-sm leading-6 text-slate-300">
        <p>{t("consent_desc_1")}</p>
        <p>{t("consent_desc_2")}</p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200 hover:border-slate-600 transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 accent-cyan-500"
        />
        <span>{t("consent_checkbox")}</span>
      </label>

      <button
        onClick={handleContinue}
        disabled={!checked || !modelsLoaded}
        className="rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950
          hover:bg-cyan-400 transition-colors
          disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("continue")}
      </button>
    </section>
  );
}