type Props = {
  modelsLoaded: boolean;
  activeStepLabel: string;
};

export default function Header({ modelsLoaded: _m, activeStepLabel: _s }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#fcd573]">
        Self Registration
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">
        KYC Onboarding
      </h1>
    </div>
  );
}
