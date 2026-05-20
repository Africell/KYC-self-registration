import { useTranslation } from "react-i18next";

type Props = {
  modelsLoaded: boolean;
  activeStepLabel: string;
};

export default function Header({ modelsLoaded: _m, activeStepLabel: _s }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#fcd573]">
        {t("header_subtitle")}
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">
        {t("header_title")}
      </h1>
    </div>
  );
}
