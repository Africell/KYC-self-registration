// src/components/steps/ConsentStep.tsx
// FR-016  Consent and declaration — mandatory before submission
// FR-017  Submission of registration — calls backend, shows acknowledgment

interface ConsentStepProps {
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  onSubmit: () => Promise<void>;
  prevStep: () => void;
  submitLoading: boolean;
  submitError: string;
}

export default function ConsentStep({
  agreed,
  setAgreed,
  onSubmit,
  prevStep,
  submitLoading,
  submitError,
}: ConsentStepProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Consent & submit</h2>
        <p className="mt-1 text-sm text-slate-400">
          Please read the declaration below and confirm your consent before
          submitting your registration.
        </p>
      </div>

      {/* ── Declaration text ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 text-sm leading-6 text-slate-300">
        <p>
          By submitting this registration, you confirm that:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-cyan-400">•</span>
            The personal information you have provided is <strong className="text-slate-200">accurate and complete</strong>.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-cyan-400">•</span>
            The identity documents and media you have uploaded <strong className="text-slate-200">belong to you</strong>.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-cyan-400">•</span>
            You <strong className="text-slate-200">consent to the processing</strong> of your personal data
            for SIM registration and regulatory compliance purposes.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-cyan-400">•</span>
            You understand that providing <strong className="text-slate-200">false information</strong> may
            result in rejection or legal consequences.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Your data is protected under applicable data-protection regulations.
          Africell will use it solely for SIM registration and compliance purposes.
        </p>
      </div>

      {/* ── Consent checkbox — FR-016 ─────────────────────────────────────── */}
      <label className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-200 cursor-pointer hover:border-slate-600 transition-colors">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
        />
        <span>
          I confirm that the information I have provided is accurate, the documents
          are mine, and I consent to data processing for SIM registration and
          regulatory compliance.
        </span>
      </label>

      {/* ── Submit error ─────────────────────────────────────────────────── */}
      {submitError && (
        <div className="rounded-2xl border border-rose-700/50 bg-rose-900/20 px-5 py-4 text-sm text-rose-300">
          <strong className="mr-1">Submission failed:</strong>
          {submitError}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
        <button
          onClick={prevStep}
          disabled={submitLoading}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200
            hover:bg-slate-800 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <button
          onClick={() => void onSubmit()}
          disabled={!agreed || submitLoading}
          className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950
            hover:bg-cyan-400 transition-colors flex items-center gap-2
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
              Submitting…
            </>
          ) : (
            "Submit registration →"
          )}
        </button>
      </div>
    </section>
  );
}
