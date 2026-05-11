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
  return (
    <div className="mb-8 grid gap-3 md:grid-cols-6">
      {steps.map((step, index) => {
        const active = index === stepIndex;
        // A step is "visited" if the user has been there — can navigate to it freely.
        const visited = index <= maxStepReached && !active;
        const clickable = visited && !!onStepClick;

        return (
          <div
            key={step.key}
            onClick={() => clickable && onStepClick(index)}
            title={clickable ? `Go to ${step.label}` : undefined}
            className={cx(
              "rounded-2xl border px-4 py-3 text-sm shadow-lg transition select-none",
              active && "border-cyan-400 bg-cyan-500/10 text-cyan-100",
              visited && "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
              visited && clickable && "cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-400",
              !active && !visited && "border-slate-800 bg-slate-900 text-slate-400",
            )}
          >
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide opacity-70">
              <span>Step {index + 1}</span>
              {visited && (
                <svg className="h-3.5 w-3.5 text-emerald-400 opacity-100" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="font-medium">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
