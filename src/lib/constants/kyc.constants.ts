import type { Step, ExtractedFields, KYCSession } from "../../types/kyc";

// ── Flow steps (section 8.2 of requirements) ─────────────────────────────────

export const steps: Step[] = [
  { key: "msisdn",         label: "Mobile Number" },
  { key: "form",           label: "KYC Details" },
  { key: "document",       label: "ID Photo" },
  { key: "selfie",         label: "Selfie Video" },
  { key: "signature",      label: "Signature" },
  { key: "consent",        label: "Consent & Submit" },
  { key: "acknowledgment", label: "Submitted" },
];

// ── Camera constraints ────────────────────────────────────────────────────────

export const videoConstraints: MediaTrackConstraints = {
  width: 720,
  height: 540,
  facingMode: "user",
};

export const docVideoConstraints: MediaTrackConstraints = {
  facingMode: "environment",
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// ── Storage keys ──────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SESSION: "kyc_session",
  OTP_TOKEN: "kyc_otp_token",
} as const;

// ── OTP config (FR-003) ───────────────────────────────────────────────────────

export const OTP_MAX_ATTEMPTS = 3;

// ── Selfie video config (FR-015) ──────────────────────────────────────────────

export const SELFIE_VIDEO_MAX_SECONDS = 10;
export const SELFIE_VIDEO_MAX_MB = 20;
export const SELFIE_VIDEO_ACCEPTED_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

// ── Field / session defaults ──────────────────────────────────────────────────

export const initialFields: ExtractedFields = {
  IdType: "",
  FirstName: "",
  MiddleName: "",
  LastName: "",
  Email: "",
  Address: "",
  IdDocSerialNumber: "",
  Nationality: "",
  BirthDate: "",
  ExpiryDate: "",
  Gender: "",
  rawMRZ: "",
  rawOCRText: "",
};

export const SESSION_DEFAULTS: Omit<KYCSession, "expiresAt"> = {
  stepKey: "msisdn",
  msisdn: "",
  agreed: false,
  selfieVideoCaptured: false,
  signatureImage: "",
  documentImage: "",
  documentBackImage: "",
  documentQuality: null,
  documentBackQuality: null,
  fields: initialFields,
  mrzValid: null,
  mrzMessage: "",
  registrationReference: "",
};
