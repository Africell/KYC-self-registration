import type { Step, ExtractedFields, KYCSession } from "../../types/kyc";

// ── Flow steps ────────────────────────────────────────────────────────────────

export const steps: Step[] = [
  { key: "msisdn", label: "step_msisdn" },
  { key: "consent", label: "step_consent" },
  { key: "selfie", label: "step_selfie" },
  { key: "document", label: "step_document" },
  { key: "ocr", label: "step_ocr" },
  { key: "signature", label: "step_signature" },
  { key: "match", label: "step_match" },
  // { key: "review", label: "step_review" },
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

// ── OTP config ────────────────────────────────────────────────────────────────

export const OTP_MAX_ATTEMPTS = 3;

// ── Field / session defaults ──────────────────────────────────────────────────

export const initialFields: ExtractedFields = {
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
  maxStepReached: 0,
  msisdn: "",
  agreed: false,
  docType: "",
  selfieImage: "",
  faceSidePhoto: "",
  documentImage: "",
  documentBackImage: "",
  signatureImage: "",
  documentQuality: null,
  documentBackQuality: null,
  fields: initialFields,
  mrzValid: null,
  mrzMessage: "",
  faceMatch: null,
};
