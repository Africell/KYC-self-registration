import { useTranslation } from "react-i18next";
import { cx } from "../../lib/utils";

type Step = {
  key: string;
  label: string;
};

type Props = {
  steps: Step[];
  stepIndex: number;
  maxStepReached: number;
  onStepClick?: (index: number) => void;
};

export default function Stepper({ steps, stepIndex, maxStepReached, onStepClick }: Props) {
  const { t } = useTranslation();
  const progressPct = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-14">
        <div className="mx-auto h-1.5 w-full rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-emerald-400 transition-all duration-500 ease-in-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="absolute inset-x-0 top-5 flex w-full -translate-y-1/2 justify-between">
          {steps.map((step, index) => {
            const active      = index === stepIndex;
            const completed   = !active && index < stepIndex;
            const revisitable = !active && index > stepIndex && index <= maxStepReached;
            const clickable   = (completed || revisitable) && !!onStepClick;
            const label       = t(step.label);

            return (
              <div key={step.key} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick(index)}
                  title={clickable ? t("stepper_goto", { label }) : label}
                  className={cx(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 focus:outline-none",
                    active      && "scale-110 border-cyan-400 bg-cyan-500 text-white shadow-lg shadow-cyan-500/40",
                    completed   && "border-emerald-400 bg-emerald-500 text-white",
                    completed   && clickable && "cursor-pointer hover:scale-110 hover:shadow-md hover:shadow-emerald-500/30",
                    revisitable && "border-amber-400 bg-slate-900 text-amber-300",
                    revisitable && clickable && "cursor-pointer hover:bg-amber-400/10 hover:scale-105",
                    !active && !completed && !revisitable && "border-slate-700 bg-slate-900 text-slate-500 cursor-default",
                  )}
                >
                  {completed ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : active ? (
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                    </span>
                  ) : (
                    index + 1
                  )}
                </button>

                <span className={cx(
                  "hidden sm:block text-xs font-medium text-center leading-tight transition-colors duration-300 w-16",
                  active      && "text-cyan-300",
                  completed   && "text-emerald-400",
                  revisitable && "text-amber-400",
                  !active && !completed && !revisitable && "text-slate-500",
                )}>
                  {label}
                </span>
                {active && (
                  <span className="block sm:hidden text-xs font-semibold text-cyan-300 text-center w-16">
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-slate-400 sm:hidden">
        {t("stepper_counter", { current: stepIndex + 1, total: steps.length })}
      </p>
    </div>
  );
}
