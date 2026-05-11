// Step keys aligned with requirements section 8.2 step layout
export type StepKey =
  | "msisdn"
  | "form"
  | "document"
  | "selfie"
  | "signature"
  | "consent"
  | "acknowledgment";

export type Step = {
  key: StepKey;
  label: string;
};

export type AppError = {
  scope: string;
  message: string;
};

// Kept for hooks not yet removed from codebase
export type LivenessChallenge =
  | "center"
  | "lookLeft"
  | "lookRight"
  | "raiseLeftHand"
  | "raiseRightHand"
  | "nodHead"
  | "moveCloser";

export type ChallengeConfig = {
  id: LivenessChallenge;
  label: string;
  instruction: string;
  icon: string;
  requiresHand: boolean;
  requiresPose: boolean;
};

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LandmarkStatus = {
  faceDetected: boolean;
  yawEstimate: number;
  qualityOk: boolean;
  hint: string;
  faceBox: FaceBox | null;
};

export type FaceMatchResult = {
  distance: number;
  similarity: number;
  threshold: number;
  passed: boolean;
  status: "pass" | "review";
};

// ── Document ──────────────────────────────────────────────────────────────────

export type DocumentQuality = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  blurScore: number;
  edgeDensity: number;
  aspectRatio: number;
  glareRatio: number;
  looksSharpEnough: boolean;
  looksBrightEnough: boolean;
  looksLowGlare: boolean;
  looksUsefulForOCR: boolean;
  reasons: string[];
};

// ── Form / OCR fields ─────────────────────────────────────────────────────────

export type ExtractedFields = {
  IdType: string;           // FR-009: Passport | Voter ID | Driver's License
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Email: string;
  Address: string;
  IdDocSerialNumber: string;
  Nationality: string;
  BirthDate: string;
  ExpiryDate: string;
  Gender: string;
  rawMRZ: string;
  rawOCRText: string;
};

export type OcrRunResult = {
  rawOCRText: string;
  rawMRZ: string;
  mrzValid: boolean;
  mrzMessage: string;
  fields: ExtractedFields;
};

// ── Submission ────────────────────────────────────────────────────────────────

export type SubmissionPayload = {
  consentAccepted: boolean;
  capturedAt: string;
  images: {
    selfieVideoRef: string;       // in-memory blob URL — not persisted to localStorage
    IdDocFrontPhoto_b64: string;
    IdDocRearPhoto_b64: string;
    signaturePhoto_b64: string;
  };
  documentQuality: DocumentQuality | null;
  ocr: ExtractedFields;
  mrz: {
    valid: boolean | null;
    message: string;
  };
  registrationReference: string;
  readyForBackendPost: boolean;
};

// ── Session ───────────────────────────────────────────────────────────────────

export interface KYCSession {
  expiresAt: number;
  stepKey: StepKey;
  msisdn: string;
  agreed: boolean;
  selfieVideoCaptured: boolean;   // video blob is in-memory only; flag persisted
  signatureImage: string;
  documentImage: string;
  documentBackImage: string;
  documentQuality: DocumentQuality | null;
  documentBackQuality: DocumentQuality | null;
  fields: ExtractedFields;
  mrzValid: boolean | null;
  mrzMessage: string;
  registrationReference: string;
}

/** A partial update — every key except expiresAt is optional. */
export type SessionPatch = Partial<Omit<KYCSession, "expiresAt">>;
