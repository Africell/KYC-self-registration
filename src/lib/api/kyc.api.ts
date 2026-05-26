// src/lib/api/kyc.api.ts

import axios from "axios";
import { ENV } from "../config/env";

const kycApi = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  validateStatus: () => true,
});

// ── Response types ────────────────────────────────────────────────────────────

export interface GenerateOTPResponse {
  Status: string;
  StatusCode: number;
  StatusDescription: string;
  StatusDate: string;
  Data: {
    MSISDN: string;
    OTP: string;
    OTPValidity: number;
  };
}

export interface ValidateOTPResponse {
  Status: string;
  StatusCode: number;
  StatusDescription: string;
  StatusDate: string;
  Data:
    | { Token: { TokenType: string; TokenValidity: number; Token: string } }
    | { AttemptsRemaining: number }
    | null;
}

export interface SIMRegistrationPayload {
  FirstName: string;
  MiddleName: string;
  LastName: string;
  Gender: string;
  BirthDate: string;
  Address: string;
  Language: string;
  Email: string;
  Nationality: string;
  FaceFrontPhoto_b64: string;
  FaceSidePhoto_b64: string;
  IdDocType: string;
  IdDocSerialNumber: string;
  NationalIdNumber: string;
  IdDocFontPhoto_b64: string;
  IdDocRearPhoto_b64: string;
  SignaturePhotoAttId64: string;
  SIMType: string;
  ICC: string;
  IMSI: string;
  MSISDNType: string;
  MSISDN: string;
  MobileMoney_Registration: boolean;
}

export interface SIMRegistrationResponse {
  Status: string;
  StatusCode: number;
  StatusDescription: string;
  Data: null | object;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export interface CompressOptions {
  quality?: number; // JPEG quality 0–1
  maxWidth?: number; // cap pixel width, preserving aspect ratio
}

// Captures and large uploads: resize to 1600 px and encode at high quality.
export const COMPRESS_DOCUMENT: CompressOptions = {
  quality: 0.92,
  maxWidth: 1600,
};
// PNG-only uploads: just convert the format; no resize needed.
export const COMPRESS_PNG_ONLY: CompressOptions = { quality: 0.95 };

export async function compressBase64Image(
  base64: string,
  { quality = 0.92, maxWidth = Infinity }: CompressOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isDataUrl = base64.startsWith("data:");
    const src = isDataUrl ? base64 : `data:image/jpeg;base64,${base64}`;

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context unavailable"));

      // Fill white so PNG transparency doesn't become black in JPEG output.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const out = canvas.toDataURL("image/jpeg", quality);
      resolve(isDataUrl ? out : out.split(",")[1]);
    };
    img.onerror = reject;
    img.src = src;
  });
}

// function b64SizeKB(base64: string): string {
//   // strip data-URL prefix if present before calculating raw byte size
//   const raw = base64.includes(",") ? base64.split(",")[1] : base64;
//   return ((raw.length * 0.75) / 1024).toFixed(1) + " KB";
// }

function dataUrlToFile(dataUrl: string, filename = "document.jpg"): File {
  const [header, base64] = dataUrl.split(",");

  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";

  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime });
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export async function apiGenerateOTP(
  msisdn: string,
  captchaToken: string,
): Promise<GenerateOTPResponse> {
  const { data } = await kycApi.post<GenerateOTPResponse>(
    `/HTTP_GenerateRegistrationOTP/`,
    null,
    {
      params: { msisdn },
      headers: { "X-Captcha-Token": captchaToken },
    },
  );
  // console.log("captchaToken", captchaToken)
  return data;
}

export async function apiValidateOTP(
  msisdn: string,
  otp: string,
  captchaToken: string,
): Promise<ValidateOTPResponse> {
  const { data } = await kycApi.post<ValidateOTPResponse>(
    `/HTTP_ValidateRegistrationOTP/`,
    { MSISDN: msisdn, OTP: otp },
    {
      headers: { "X-Captcha-Token": captchaToken },
    },
  );
  return data;
}

// ── SIM Registration ──────────────────────────────────────────────────────────

export async function apiSubmitSIMRegistration(
  payload: SIMRegistrationPayload,
  token: string,
): Promise<SIMRegistrationResponse> {
  console.log("payload", payload);
  const { data } = await kycApi.post<SIMRegistrationResponse>(
    `/HTTP_FCDM_SIMRegistration_Add/`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        SourceApp: "",
      },
    },
  );
  // console.log("checking data returens on register", data)
  return data;
}

// ── OCR / MRZ ─────────────────────────────────────────────────────────────────

export async function apiValidateMRZFromOCR(
  dataUrl: string,
  token: string,
): Promise<any> {
  const file = dataUrlToFile(dataUrl);

  const form = new FormData();
  form.append("file", file);

  const response = await kycApi.post(`/HTTP_ValidateMRZFromOCR/`, form, {
    // baseURL: ENV.MRZ_API_BASE_URL,
    headers: {
      "Content-Type": undefined,
      Authorization: `Bearer ${token}`,
      SourceApp: "",
    },
  });

  return response.data;
}

export async function apiValidateDRCNationalIDFromOCR(
  dataUrl: string,
  token: string,
): Promise<any> {
  const file = dataUrlToFile(dataUrl);

  const form = new FormData();
  form.append("file", file);

  const response = await kycApi.post(
    `/HTTP_ValidateDRCNationalIDFromOCR/`,
    form,
    {
      headers: {
        "Content-Type": undefined,
        Authorization: `Bearer ${token}`,
        SourceApp: "",
      },
    },
  );

  return response.data;
}

export async function apiValidateDRCDrivingLicenceFromOCR(
  dataUrl: string,
  token: string,
): Promise<any> {
  const file = dataUrlToFile(dataUrl);

  const form = new FormData();
  form.append("file", file);

  const response = await kycApi.post(
    `/HTTP_ValidateDRCDrivingLicenceFromOCR/`,
    form,
    {
      headers: {
        "Content-Type": undefined,
        Authorization: `Bearer ${token}`,
        SourceApp: "",
      },
    },
  );

  return response.data;
}

// ── Document Type Validation ──────────────────────────────────────────────────

export interface ValidateDocumentTypeResponse {
  Status: string;
  StatusCode: number;
  Data: {
    confidence: number;
    detected_class: string;
    document_detected: boolean;
    processing_time_ms: number;
    scores: Record<string, number>;
  };
}

export async function apiValidateDocumentFromOCR(
  dataUrl: string,
  token: string,
): Promise<ValidateDocumentTypeResponse> {
  const file = dataUrlToFile(dataUrl);
  const form = new FormData();
  form.append("file", file);

  const { data } = await kycApi.post<ValidateDocumentTypeResponse>(
    `/HTTP_ValidateDocumentFromOCR/`,
    form,
    {
      headers: {
        "Content-Type": undefined,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data;
}

// ── Face Match ────────────────────────────────────────────────────────────────

export interface FaceMatchApiResponse {
  result: "match" | "no_match";
  similarity: number;
  confidence_level: "high" | "medium" | "low";
  threshold: number;
  doc_mp_aligned: boolean;
  photo_mp_aligned: boolean;
  doc_face_b64: string;
  cam_face_b64: string;
  doc_detection: { bbox: number[]; confidence: number };
  cam_detection: { bbox: number[]; confidence: number };
  timing: {
    doc_yolo_ms: number;
    cam_yolo_ms: number;
    doc_embedding_ms: number;
    cam_embedding_ms: number;
    total_ms: number;
  };
}

export async function apiFaceMatch(
  documentDataUrl: string,
  selfieDataUrl: string,
  selfieCropped: boolean,
  token: string,
): Promise<FaceMatchApiResponse> {
  const form = new FormData();
  form.append("document", dataUrlToFile(documentDataUrl, "document.jpg"));
  form.append("selfie", dataUrlToFile(selfieDataUrl, "selfie.jpg"));
  form.append("selfie_pre_cropped", String(selfieCropped));
  console.log("String(selfieCropped)", String(selfieCropped));
  const { data } = await kycApi.post("/HTTP_FaceMatching/", form, {
    headers: {
      "Content-Type": undefined,
      Authorization: `Bearer ${token}`,
      Login: ENV.API_LOGIN,
      SourceApp: "FCDM_App",
    },
  });
  console.log("data for fac match", data?.Data);
  return data.Data;
}
