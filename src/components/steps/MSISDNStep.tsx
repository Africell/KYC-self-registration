// src/components/steps/MSISDNStep.tsx

import { useState, useCallback, useMemo, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
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

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

// How long to hold after a successful captcha before moving on, so the
// widget's success checkmark is actually visible instead of being
// unmounted immediately by the phase/step change that follows.
const SUCCESS_DISPLAY_MS = 700;

type CaptchaAction = "msisdn_check" | "otp_verify";

function CaptchaDisclaimer() {
  const { t } = useTranslation();
  return (
    <p className="text-center text-xs text-slate-600">
      {t("msisdn_recaptcha")}{" "}
      <a
        href="https://www.cloudflare.com/privacypolicy/"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        {t("msisdn_privacy")}
      </a>{" "}
      &amp;{" "}
      <a
        href="https://www.cloudflare.com/website-terms/"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        {t("msisdn_terms")}
      </a>
    </p>
  );
}

function useTurnstileExecutor(ref: React.RefObject<TurnstileInstance | null>) {
  const pendingRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const onSuccess = useCallback((token: string) => {
    pendingRef.current?.resolve(token);
    pendingRef.current = null;
  }, []);

  const onError = useCallback(() => {
    pendingRef.current?.reject(new Error("TURNSTILE_ERROR"));
    pendingRef.current = null;
  }, []);

  const execute = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      ref.current?.reset();
      ref.current?.execute();
    });
  }, [ref]);

  return { execute, onSuccess, onError };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MSISDNStep({
  msisdn,
  setMsisdn,
  nextStep,
}: MSISDNStepProps) {
  const { t } = useTranslation();
  const msisdnCheckRef = useRef<TurnstileInstance>(null);
  const otpVerifyRef = useRef<TurnstileInstance>(null);
  const msisdnCheckCaptcha = useTurnstileExecutor(msisdnCheckRef);
  const otpVerifyCaptcha = useTurnstileExecutor(otpVerifyRef);

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
    async (action: CaptchaAction): Promise<string | null> => {
      const captcha =
        action === "msisdn_check" ? msisdnCheckCaptcha : otpVerifyCaptcha;

      // Transient failures (script load timing, brief network blip) are
      // retried by resetting the widget and re-executing it.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const token = await captcha.execute();
          // Widget still shows its success checkmark at this point — hold
          // here briefly so it's visible before the phase/step change below
          // unmounts it, instead of the UI jumping straight past it.
          await new Promise((res) => setTimeout(res, SUCCESS_DISPLAY_MS));
          return token;
        } catch (err) {
          if (attempt === MAX_ATTEMPTS - 1) {
            setError("captcha", t("msisdn_error_captcha"));
            return null;
          }
          await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
        }
      }

      setError("captcha", t("msisdn_error_captcha"));
      return null;
    },
    [msisdnCheckCaptcha, otpVerifyCaptcha, setError, t],
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

  // Turnstile must stay actually rendered (not display:none) or its
  // challenge iframe can stall instead of resolving. "interaction-only"
  // keeps it invisible/zero-size when no challenge is needed, but lets it
  // render in place — visible and solvable — if Cloudflare decides this
  // visitor needs an interactive check. Each widget is rendered directly
  // above the button it gates.
  // TEMP DEBUG: appearance set to "always" so the widgets are visible
  // on-screen for verification — switch back to "interaction-only" once
  // confirmed.
  const msisdnCheckWidget = (
    <Turnstile
      ref={msisdnCheckRef}
      siteKey={TURNSTILE_SITE_KEY}
      options={{
        action: "msisdn_check",
        execution: "execute",
        appearance: "always",
      }}
      onSuccess={msisdnCheckCaptcha.onSuccess}
      onError={msisdnCheckCaptcha.onError}
    />
  );

  const otpVerifyWidget = (
    <Turnstile
      ref={otpVerifyRef}
      siteKey={TURNSTILE_SITE_KEY}
      options={{
        action: "otp_verify",
        execution: "execute",
        appearance: "always",
      }}
      onSuccess={otpVerifyCaptcha.onSuccess}
      onError={otpVerifyCaptcha.onError}
    />
  );

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
            placeholder="+243 900 100 100"
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

          {msisdnCheckWidget}

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

          <CaptchaDisclaimer />
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
            captchaSlot={otpVerifyWidget}
          />

          <CaptchaDisclaimer />
        </div>
      )}
    </section>
  );
}
