// src/components/steps/MSISDNStep.tsx

import { useState, useCallback, useMemo } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useTranslation } from "react-i18next";
import {
  checkMSISDN,
  generateOTP,
  verifyOTP,
  clearOTP,
  isValidE164,
} from "../../lib/services/msisdn.service";
import OTPSection from "./OTPSection";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "IDLE" | "REGISTERED" | "OTP_SENT" | "VERIFIED";

interface MSISDNStepProps {
  msisdn: string;
  setMsisdn: (v: string) => void;
  nextStep: () => void;
}

interface ErrorState {
  input: string;
  otp: string;
  captcha: string;
}

const EMPTY_ERRORS: ErrorState = { input: "", otp: "", captcha: "" };

function RecaptchaDisclaimer() {
  const { t } = useTranslation();
  return (
    <p className="text-center text-xs text-slate-600">
      {t("msisdn_recaptcha")}{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        {t("msisdn_privacy")}
      </a>{" "}
      &amp;{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        {t("msisdn_terms")}
      </a>
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MSISDNStep({
  msisdn,
  setMsisdn,
  nextStep,
}: MSISDNStepProps) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [phase, setPhase] = useState<Phase>("IDLE");
  const [errors, setErrors] = useState<ErrorState>(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);
  const [otpTotalSeconds, setOtpTotalSeconds] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | undefined>(undefined);

  const setError = useCallback(
    (field: keyof ErrorState, message: string) =>
      setErrors((prev) => ({ ...prev, [field]: message })),
    [],
  );

  const clearErrors = useCallback(() => setErrors(EMPTY_ERRORS), []);

  const maskedPhone = useMemo(
    () => msisdn.slice(0, -4).replace(/[^+\s]/g, "•") + msisdn.slice(-4),
    [msisdn],
  );

  const executeCaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!executeRecaptcha) {
        setError("captcha", t("msisdn_error_captcha"));
        return null;
      }
      return executeRecaptcha(action);
    },
    [executeRecaptcha, setError, t],
  );

  // ── Phone input ───────────────────────────────────────────────────────────

  const handlePhoneChange = useCallback(
    (value: string) => {
      let cleaned = value.replace(/[^\d+\s]/g, "");
      if (cleaned.includes("+")) cleaned = "+" + cleaned.replace(/\+/g, "");
      setMsisdn(cleaned);
      clearErrors();
      if (phase === "REGISTERED") setPhase("IDLE");
    },
    [phase, setMsisdn, clearErrors],
  );

  // ── Send OTP ──────────────────────────────────────────────────────────────

  const handleContinue = useCallback(async () => {
    clearErrors();

    if (!isValidE164(msisdn)) {
      setError("input", t("msisdn_error_invalid"));
      return;
    }

    const token = await executeCaptcha("msisdn_check");
    if (!token) return;

    setLoading(true);
    try {
      const result = checkMSISDN(msisdn);
      if (result === "REGISTERED") {
        setPhase("REGISTERED");
        setError("input", t("msisdn_error_registered"));
        return;
      }

      const validitySeconds = await generateOTP(msisdn, token);
      setOtpTotalSeconds(validitySeconds);
      setAttemptsLeft(undefined);
      setPhase("OTP_SENT");
    } catch (err) {
      console.error("[MSISDNStep] OTP generation error:", err);
      setError(
        "captcha",
        err instanceof Error ? err.message : t("msisdn_error_send"),
      );
    } finally {
      setLoading(false);
    }
  }, [msisdn, executeCaptcha, clearErrors, setError, t]);

  // ── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerify = useCallback(
    async (code: string) => {
      clearErrors();

      const token = await executeCaptcha("otp_verify");
      if (!token) return;

      setLoading(true);
      try {
        const result = await verifyOTP(msisdn, code, token);

        if (result.ok) {
          setPhase("VERIFIED");
          nextStep();
          return;
        }

        setError("otp", result.message);

        if (result.reason === "WRONG_CODE") {
          setAttemptsLeft(result.attemptsRemaining);
        } else {
          setAttemptsLeft(undefined);
          setPhase("IDLE");
        }
      } catch (err) {
        console.error("[MSISDNStep] OTP verification error:", err);
        setError("otp", t("msisdn_error_send"));
      } finally {
        setLoading(false);
      }
    },
    [msisdn, executeCaptcha, nextStep, clearErrors, setError, t],
  );

  // ── Resend OTP ────────────────────────────────────────────────────────────

  const handleResend = useCallback(async (): Promise<number> => {
    clearOTP();
    clearErrors();

    const token = await executeCaptcha("msisdn_check");
    if (!token) return otpTotalSeconds;

    setLoading(true);
    try {
      const validitySeconds = await generateOTP(msisdn, token);
      setAttemptsLeft(undefined);
      return validitySeconds;
    } catch (err) {
      console.error("[MSISDNStep] OTP resend error:", err);
      setError(
        "otp",
        err instanceof Error ? err.message : t("msisdn_error_resend"),
      );
      return otpTotalSeconds;
    } finally {
      setLoading(false);
    }
  }, [msisdn, otpTotalSeconds, executeCaptcha, clearErrors, setError, t]);

  // ── Go back to phone input ────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    clearOTP();
    clearErrors();
    setPhase("IDLE");
  }, [clearErrors]);

  // ── Render ────────────────────────────────────────────────────────────────

  const showPhoneInput = phase === "IDLE" || phase === "REGISTERED";
  const showOTPInput = phase === "OTP_SENT";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("msisdn_title")}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {showOTPInput ? t("msisdn_subtitle_otp") : t("msisdn_subtitle_idle")}
        </p>
      </div>

      {/* ── Phone input ─────────────────────────────────────────────────── */}
      {showPhoneInput && (
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-slate-500">
            {t("msisdn_label")}
          </label>

          <input
            value={msisdn}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+243 970 000 001"
            inputMode="tel"
            autoComplete="tel"
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && void handleContinue()}
            className={`w-full rounded-2xl bg-slate-900 border px-4 py-3 text-slate-100
              placeholder:text-slate-600 outline-none transition-all focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.input
                  ? "border-rose-500 focus:border-rose-400 focus:ring-rose-400/20"
                  : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-400/20"
              }`}
          />

          {errors.input && (
            <p className="flex items-center gap-1.5 text-sm text-rose-400">
              <span>⚠</span> {errors.input}
            </p>
          )}
          {errors.captcha && (
            <p className="flex items-center gap-1.5 text-sm text-amber-400">
              <span>🔒</span> {errors.captcha}
            </p>
          )}

          <button
            onClick={() => void handleContinue()}
            disabled={!msisdn.trim() || loading}
            className="w-full rounded-2xl bg-cyan-500 py-3 font-semibold text-slate-950
              disabled:cursor-not-allowed disabled:opacity-40 hover:bg-cyan-400
              transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                {t("msisdn_sending")}
              </>
            ) : (
              t("msisdn_send")
            )}
          </button>

          <RecaptchaDisclaimer />
        </div>
      )}

      {/* ── OTP entry ───────────────────────────────────────────────────── */}
      {showOTPInput && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {t("msisdn_code_sent", { phone: maskedPhone })}
            </span>
            <button
              onClick={handleBack}
              className="text-cyan-400 hover:text-cyan-300 hover:underline text-xs transition-colors"
            >
              {t("msisdn_change")}
            </button>
          </div>

          {errors.captcha && (
            <p className="flex items-center gap-1.5 text-sm text-amber-400">
              <span>🔒</span> {errors.captcha}
            </p>
          )}

          <OTPSection
            onVerify={handleVerify}
            onResend={handleResend}
            error={errors.otp}
            loading={loading}
            initialSeconds={otpTotalSeconds}
            attemptsLeft={attemptsLeft}
          />

          <RecaptchaDisclaimer />
        </div>
      )}
    </section>
  );
}
