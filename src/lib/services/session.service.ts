import type {
  StepKey,
  ExtractedFields,
  FaceMatchResult,
  DocumentQuality,
} from "../../types/kyc";

const SESSION_KEY    = "kyc_session";

export interface KYCSession {
  expiresAt: number;
  stepKey: StepKey;
  msisdn: string;
  agreed: boolean;
  selfieImage: string;
  faceSidePhoto: string;
  documentImage: string;
  documentBackImage: string;
  documentQuality: DocumentQuality | null;
  documentBackQuality: DocumentQuality | null;
  fields: ExtractedFields;
  mrzValid: boolean | null;
  mrzMessage: string;
  faceMatch: FaceMatchResult | null;
}

export type SessionPatch = Partial<Omit<KYCSession, "expiresAt">>;

const EMPTY_FIELDS: ExtractedFields = {
  FirstName:         "",
  MiddleName:        "",
  LastName:          "",
  Email:             "",
  Address:           "",
  IdDocSerialNumber: "",
  Nationality:       "",
  BirthDate:         "",
  ExpiryDate:        "",
  Gender:            "",
  rawMRZ:            "",
  rawOCRText:        "",
};

const SESSION_DEFAULTS: Omit<KYCSession, "expiresAt"> = {
  stepKey:             "msisdn",
  msisdn:              "",
  agreed:              false,
  selfieImage:         "",
  faceSidePhoto:       "",
  documentImage:       "",
  documentBackImage:   "",
  documentQuality:     null,
  documentBackQuality: null,
  fields:              EMPTY_FIELDS,
  mrzValid:            null,
  mrzMessage:          "",
  faceMatch:           null,
};

// ── KYC Session ───────────────────────────────────────────────────────────────

export function loadSession(): KYCSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: KYCSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Creates a brand-new KYC session anchored to the given expiresAt.
 * Always wipes any existing session first so the expiry is never inherited.
 * Called once from generateOTP so both timers share the same birth moment.
 */
export function createSession(patch: SessionPatch, expiresAt: number): void {
  try {
    // Always start fresh — never inherit a stale expiresAt
    localStorage.removeItem(SESSION_KEY);
    const next: KYCSession = {
      ...SESSION_DEFAULTS,
      ...patch,
      expiresAt,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded or private mode — fail silently
  }
}

/**
 * Patches an existing session without ever touching expiresAt.
 * If no session exists yet (e.g. called before OTP), it is a no-op
 * so we never accidentally create a session with the wrong expiry.
 */
export function saveSession(patch: SessionPatch): void {
  try {
    const existing = loadSession();
    if (!existing) return; // no session yet — wait for createSession
    const next: KYCSession = {
      ...existing,
      ...patch,
      expiresAt: existing.expiresAt, // never overwrite
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded or private mode — fail silently
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── OTP token ─────────────────────────────────────────────────────────────────

const OTP_TOKEN_KEY = "kyc_otp_token";

export function clearOTPTokenFromStorage(): void {
  localStorage.removeItem(OTP_TOKEN_KEY);
}

export function getOTPTokenExpiry(): number | null {
  try {
    const raw = localStorage.getItem(OTP_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token: string; expiresAt: number };
    if (parsed?.expiresAt && typeof parsed.expiresAt === "number") {
      return parsed.expiresAt;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Unified expiry watcher ────────────────────────────────────────────────────
// Cleans up both kyc_session and kyc_otp_token when they expire.
// Call once in App.tsx — returns a cleanup function for useEffect.

export function startExpiryWatcher(): () => void {
  function runChecks(): void {
    // KYC session — loadSession() already calls clearSession() if expired
    loadSession();

    // OTP token — clear it if its own expiresAt has passed
    try {
      const raw = localStorage.getItem(OTP_TOKEN_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as { token: string; expiresAt: number };
      if (Date.now() > stored.expiresAt) {
        clearOTPTokenFromStorage();
      }
    } catch {
      clearOTPTokenFromStorage();
    }
  }

  runChecks();

  const interval = window.setInterval(runChecks, 60_000);

  const handleVisibility = () => {
    if (document.visibilityState === "visible") runChecks();
  };
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}