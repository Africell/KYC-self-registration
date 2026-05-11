// src/components/steps/AcknowledgmentStep.tsx
// FR-017  On-screen acknowledgment after successful submission

interface AcknowledgmentStepProps {
  msisdn: string;
  registrationReference: string;
  resetFlow: () => void;
}

export default function AcknowledgmentStep({
  msisdn,
  registrationReference,
  resetFlow,
}: AcknowledgmentStepProps) {
  const maskedPhone = msisdn
    ? msisdn.slice(0, -4).replace(/[^+\s]/g, "•") + msisdn.slice(-4)
    : "";

  return (
    <section className="space-y-6">
      {/* ── Success icon ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/40 border-2 border-emerald-600/50">
          <svg
            className="h-10 w-10 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-emerald-300">
            Registration submitted
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Your registration request has been received
          </p>
        </div>
      </div>

      {/* ── Reference & next steps ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <div className="space-y-3">
          {registrationReference && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Reference number
              </span>
              <span className="font-mono text-sm font-semibold text-cyan-300">
                {registrationReference}
              </span>
            </div>
          )}

          {maskedPhone && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Mobile number
              </span>
              <span className="font-mono text-sm text-slate-200">{maskedPhone}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 space-y-2">
          <p className="text-sm font-medium text-slate-200">What happens next</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Your submission is being validated. This may take a short time.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              You will receive an <strong className="text-slate-300">SMS notification</strong> on{" "}
              {maskedPhone || "your number"} once processing is complete.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              If your registration is rejected, the SMS will include the reason and
              next steps.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              If you need assistance, please visit the nearest{" "}
              <strong className="text-slate-300">Africell shop</strong> with your
              valid ID document.
            </li>
          </ul>
        </div>
      </div>

      {/* ── Page message per FR-017 ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-cyan-800/40 bg-cyan-900/10 px-5 py-4 text-sm text-cyan-200">
        Your registration request has been received and sent for validation. You
        will receive an SMS once the process is completed.
      </div>

      {/* ── Start over ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800 pt-5">
        <button
          onClick={resetFlow}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Register another number
        </button>
      </div>
    </section>
  );
}
