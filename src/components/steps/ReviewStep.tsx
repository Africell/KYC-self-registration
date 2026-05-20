import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubmissionPayload } from "../../types/kyc";
import { truncateDeep } from "../../utils/image";
import { apiSubmitSIMRegistration, type SIMRegistrationPayload } from "../../lib/api/kyc.api";
import axios from "axios";

const TOKEN_STORAGE_KEY = "kyc_otp_token";

function loadToken(): string {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { token: string; expiresAt: number };
    if (Date.now() > parsed.expiresAt) return "";
    return parsed.token ?? "";
  } catch {
    return "";
  }
}

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: unknown }
  | { status: "error"; message: string };

type Props = {
  internalPayload: SubmissionPayload;
  backendPayload: SIMRegistrationPayload;
  prevStep: () => void;
  exportPayloadFile: () => void;
  resetFlow: () => void;
};

export default function ReviewStep({ internalPayload, backendPayload, prevStep, exportPayloadFile, resetFlow }: Props) {
  const { t } = useTranslation();
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [showDebug, setShowDebug]     = useState(false);

  useEffect(() => {
    if (submitState.status === "success") {
      localStorage.clear();
    }
  }, [submitState.status]);

  const handleSubmit = async () => {
    try {
      setSubmitState({ status: "loading" });
      const token = loadToken();
      if (!token) {
        setSubmitState({ status: "error", message: t("review_error_session") });
        return;
      }
      const response = await apiSubmitSIMRegistration(backendPayload, token);
      setSubmitState({ status: "success", data: response });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        console.log("what is body", body);
        const message = body?.ErrorDescription || body?.StatusDescription || err.message || t("review_error_unexpected");
        setSubmitState({ status: "error", message });
      } else {
        setSubmitState({ status: "error", message: err instanceof Error ? err.message : t("review_error_unexpected") });
      }
    }
  };

  const isLoading = submitState.status === "loading";
  const isSuccess = submitState.status === "success";

  if (isSuccess) {
    return (
      <section className="flex flex-col items-center justify-center gap-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <svg className="h-10 w-10 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">{t("review_success_title")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("review_success_desc")}</p>
        </div>
        <button
          onClick={resetFlow}
          className="rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          {t("review_btn_new")}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{t("review_title")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("review_subtitle")}</p>
      </div>

      {submitState.status === "error" && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {submitState.message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("review_payload_title")}</p>
        </div>
        <pre className="overflow-auto p-4 text-xs text-slate-200 whitespace-pre-wrap max-h-64">
          {JSON.stringify(truncateDeep(backendPayload), null, 2)}
        </pre>
      </div>

      <div className="rounded-xl border border-slate-700/50">
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span className="uppercase tracking-wide font-medium">{t("review_debug_title")}</span>
          <svg className={`h-4 w-4 transition-transform ${showDebug ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showDebug && (
          <div className="border-t border-slate-700/50">
            <pre className="overflow-auto p-4 text-xs text-slate-400 whitespace-pre-wrap max-h-48">
              {JSON.stringify(truncateDeep(internalPayload), null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-4">
        <button
          onClick={prevStep}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t("back")}
        </button>

        <button
          onClick={exportPayloadFile}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t("review_btn_download")}
        </button>

        <button
          onClick={() => void handleSubmit()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              {t("review_sending")}
            </>
          ) : isSuccess ? (
            <>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {t("review_resend")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              {t("review_btn_submit")}
            </>
          )}
        </button>

        <button
          onClick={resetFlow}
          disabled={isLoading}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("review_btn_restart")}
        </button>
      </div>
    </section>
  );
}
