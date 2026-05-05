import registeredUsers from "../../mock/registeredUsers.json";
import { apiGenerateOTP, apiValidateOTP } from "../api/kyc.api";
import { clearOTPTokenFromStorage, createSession } from "./session.service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckResult = "REGISTERED" | "ELIGIBLE" | "INVALID";

export type OTPResult =
  | { ok: true }
  | { ok: false; reason: "WRONG_CODE" | "EXPIRED" | "MAX_ATTEMPTS" };

// ── Constants ─────────────────────────────────────────────────────────────────

const OTP_TOKEN_KEY = "kyc_otp_token";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface OTPSession {
  msisdn: string;
  expiresAt: number;
}

interface StoredOTPToken {
  token: string;
  expiresAt: number;
}

// ── Restore activeSession from localStorage on page load ──────────────────────
// Rebuilds the in-memory session from the persisted token so the timer
// and verifyOTP survive a page refresh.

let activeSession: OTPSession | null = null;

try {
  const raw = localStorage.getItem(OTP_TOKEN_KEY);
  if (raw) {
    const stored = JSON.parse(raw) as StoredOTPToken;
    if (stored.expiresAt && Date.now() < stored.expiresAt) {
      activeSession = { msisdn: "", expiresAt: stored.expiresAt };
    }
  }
} catch {
  // ignore — corrupted storage
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function normalizeMSISDN(raw: string): string {
  return raw.replace(/^\+/, "").replace(/\s/g, "");
}

export function isValidE164(msisdn: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(msisdn.trim());
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function saveToken(token: string, expiresAt: number): void {
  const stored: StoredOTPToken = { token, expiresAt };
  console.log("💾 Saving token with expiresAt:", new Date(expiresAt).toString());
  localStorage.setItem(OTP_TOKEN_KEY, JSON.stringify(stored));
}

function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(OTP_TOKEN_KEY);
    if (!raw) return null;
    const stored: StoredOTPToken = JSON.parse(raw);
    if (Date.now() > stored.expiresAt) {
      console.log("⏰ OTP token expired, removing");
      clearOTPTokenFromStorage();
      return null;
    }
    console.log("📦 Loaded token, expires:", new Date(stored.expiresAt).toString());
    return stored.token;
  } catch {
    return null;
  }
}

function removeToken(): void {
  console.log("🧹 Removing token");
  clearOTPTokenFromStorage();
}

// ── Registration check ────────────────────────────────────────────────────────

export function checkMSISDN(msisdn: string): CheckResult {
  if (!isValidE164(msisdn)) return "INVALID";
  const normalized = normalizeMSISDN(msisdn);
  const exists = registeredUsers.some(
    (u) => normalizeMSISDN(u.msisdn) === normalized,
  );
  return exists ? "REGISTERED" : "ELIGIBLE";
}

// ── Generate OTP ──────────────────────────────────────────────────────────────

export async function generateOTP(msisdn: string): Promise<void> {
  const normalized = normalizeMSISDN(msisdn);
  const data = await apiGenerateOTP(normalized);

  if (data.StatusCode !== 200 || data.Status !== "successful") {
    throw new Error(data.StatusDescription ?? "OTP generation failed");
  }

  const token      = data.Data.Token.Token;
  const ttlMs      = data.Data.Token.TokenValidity * 1000;
  const serverTime = new Date(data.StatusDate).getTime();
  const expiresAt  = serverTime + ttlMs;

  console.log("🧠 OTP expiresAt:", new Date(expiresAt).toString());

  // 1. Persist OTP token with its expiresAt — survives page refresh
  saveToken(token, expiresAt);

  // 2. Create KYC session anchored to the exact same expiresAt.
  //    Both timers are born together with an identical expiry.
  createSession({ msisdn: normalized }, expiresAt);

  // 3. Keep activeSession in memory for this tab
  activeSession = { msisdn: normalized, expiresAt };
}

// ── Timer ─────────────────────────────────────────────────────────────────────

export function getOTPSecondsLeft(): number {
  if (!activeSession) return 0;
  return Math.max(0, Math.ceil((activeSession.expiresAt - Date.now()) / 1000));
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export function getOTPAttemptsLeft(): number {
  return activeSession ? 3 : 0;
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

export async function verifyOTP(
  msisdn: string,
  otp: string,
): Promise<OTPResult> {
  if (!activeSession) {
    return { ok: false, reason: "EXPIRED" };
  }

  if (Date.now() > activeSession.expiresAt) {
    activeSession = null;
    removeToken();
    return { ok: false, reason: "EXPIRED" };
  }

  const token = loadToken();
  if (!token) {
    activeSession = null;
    return { ok: false, reason: "EXPIRED" };
  }

  const normalized = normalizeMSISDN(msisdn);
  const data = await apiValidateOTP(normalized, otp, token);

  if (data.StatusCode === 200 && data.Status === "successful") {
    console.log("✅ OTP verified");
    return { ok: true };
  }

  const desc = data.StatusDescription ?? "";

  if (/expired/i.test(desc)) {
    activeSession = null;
    removeToken();
    return { ok: false, reason: "EXPIRED" };
  }

  if (/attempt|limit|max/i.test(desc)) {
    activeSession = null;
    removeToken();
    return { ok: false, reason: "MAX_ATTEMPTS" };
  }

  return { ok: false, reason: "WRONG_CODE" };
}

// ── Clear session ─────────────────────────────────────────────────────────────

export function clearOTP(): void {
  activeSession = null;
  removeToken();
}