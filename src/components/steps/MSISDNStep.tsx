// src/components/steps/MSISDNStep.tsx
//
// FR-002  Mobile number entry and format validation
// FR-003  OTP generation and delivery
// FR-004  OTP verification
// FR-005  Registration check AFTER successful OTP — not before
// FR-006  Already-registered handling: guidance screen, USSD code, shop advice

import { useState, useCallback, useMemo } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import {
  checkMSISDN,
  generateOTP,
  verifyOTP,
  clearOTP,
  isValidE164,
} from "../../lib/services/msisdn.service";
import OTPSection from "./OTPSection";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "IDLE" | "OTP_SENT" | "VERIFIED" | "REGISTERED";

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
  return (
    <p className="text-center text-xs text-slate-600">
      Protected by reCAPTCHA —{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        Privacy
      </a>{" "}
      &amp;{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-slate-400 transition-colors"
      >
        Terms
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
        setError("captcha", "Security check not ready yet. Please wait a moment.");
        return null;
      }
      return executeRecaptcha(action);
    },
    [executeRecaptcha, setError],
  );

  // ── Phone input ───────────────────────────────────────────────────────────

  const handlePhoneChange = useCallback(
    (value: string) => {
      let cleaned = value.replace(/[^\d+\s]/g, "");
      if (cleaned.includes("+")) cleaned = "+" + cleaned.replace(/\+/g, "");
      setMsisdn(cleaned);
      clearErrors();
    },
    [setMsisdn, clearErrors],
  );

  // ── Send OTP ──────────────────────────────────────────────────────────────
  // FR-002: validate number format first; FR-003: only send after validation

  const handleContinue = useCallback(async () => {
    clearErrors();

    if (!isValidE164(msisdn)) {
      setError("input", "Enter a valid international number (e.g. +243970000001)");
      return;
    }

    const token = await executeCaptcha("msisdn_check");
    if (!token) return;

    setLoading(true);
    try {
      const validitySeconds = await generateOTP(msisdn, token);
      setOtpTotalSeconds(validitySeconds);
      setAttemptsLeft(undefined);
      setPhase("OTP_SENT");
    } catch (err) {
      console.error("[MSISDNStep] OTP generation error:", err);
      setError(
        "captcha",
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [msisdn, executeCaptcha, clearErrors, setError]);

  // ── Verify OTP ────────────────────────────────────────────────────────────
  // FR-004: verify OTP; FR-005: check registration status AFTER successful verification

  const handleVerify = useCallback(
    async (code: string) => {
      clearErrors();

      const token = await executeCaptcha("otp_verify");
      if (!token) return;

      setLoading(true);
      try {
        const result = await verifyOTP(msisdn, code, token);

        if (result.ok) {
          // FR-005: registration check happens after OTP success, not before send
          const registrationStatus = checkMSISDN(msisdn);
          if (registrationStatus === "REGISTERED") {
            setPhase("REGISTERED");
            return;
          }
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
        setError("otp", "Verification failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [msisdn, executeCaptcha, nextStep, clearErrors, setError],
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
        err instanceof Error ? err.message : "Failed to resend code. Please try again.",
      );
      return otpTotalSeconds;
    } finally {
      setLoading(false);
    }
  }, [msisdn, otpTotalSeconds, executeCaptcha, clearErrors, setError]);

  // ── Back to phone input ───────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    clearOTP();
    clearErrors();
    setPhase("IDLE");
  }, [clearErrors]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Verify your number</h2>
        <p className="mt-1 text-sm text-slate-400">
          {phase === "OTP_SENT"
            ? "We sent a code to your number."
            : phase === "REGISTERED"
            ? "Registration status confirmed."
            : "Enter your mobile number to get started."}
        </p>
      </div>

      {/* ── Phone input ──────────────────────────────────────────────────── */}
      {phase === "IDLE" && (
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-slate-500">
            Mobile number
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
                Sending code…
              </>
            ) : (
              "Send verification code →"
            )}
          </button>

          <RecaptchaDisclaimer />
        </div>
      )}

      {/* ── OTP entry ────────────────────────────────────────────────────── */}
      {phase === "OTP_SENT" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Code sent to{" "}
              <span className="text-slate-200 font-medium">{maskedPhone}</span>
            </span>
            <button
              onClick={handleBack}
              className="text-cyan-400 hover:text-cyan-300 hover:underline text-xs transition-colors"
            >
              Change number
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

      {/* ── Already registered (FR-006) ───────────────────────────────────── */}
      {phase === "REGISTERED" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-700/50 bg-amber-900/15 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">ℹ️</span>
              <div>
                <h3 className="text-lg font-semibold text-amber-200">
                  SIM Already Registered
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  This SIM is already registered. To check the ID details linked to
                  your line, dial{" "}
                  <span className="font-mono font-semibold text-amber-300">*XXX#</span>.
                  If the details are incorrect, please visit the nearest Africell shop
                  with your valid ID.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              What you can do
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 h-5 w-5 rounded-full bg-cyan-900/60 border border-cyan-700/50 text-cyan-400 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Dial{" "}
                  <span className="font-mono text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    *XXX#
                  </span>{" "}
                  to check the ID details currently linked to your SIM
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 h-5 w-5 rounded-full bg-cyan-900/60 border border-cyan-700/50 text-cyan-400 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  If the ID details are incorrect, visit the nearest{" "}
                  <strong className="text-slate-200">Africell shop</strong> with a
                  valid ID document to have them corrected
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => {
              clearOTP();
              clearErrors();
              setMsisdn("");
              setPhase("IDLE");
            }}
            className="w-full rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Use a different number
          </button>
        </div>
      )}
    </section>
  );
}
