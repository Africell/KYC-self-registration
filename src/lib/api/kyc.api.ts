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

async function compressBase64Image(
  base64: string,
  quality = 0.7,
  maxWidth = 1280,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isDataUrl = base64.startsWith("data:");
    const dataUrl = isDataUrl ? base64 : `data:image/jpeg;base64,${base64}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context unavailable"));

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(isDataUrl ? compressed : compressed.split(",")[1]);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// function b64SizeKB(base64: string): string {
//   // strip data-URL prefix if present before calculating raw byte size
//   const raw = base64.includes(",") ? base64.split(",")[1] : base64;
//   return ((raw.length * 0.75) / 1024).toFixed(1) + " KB";
// }

function dataUrlToFile(
  dataUrl: string,
  filename = "document.jpg",
): File {
  const [header, base64] = dataUrl.split(",");

  const mime =
    header.match(/:(.*?);/)?.[1] ?? "image/jpeg";

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

const IMAGE_FIELDS = [
  "FaceFrontPhoto_b64",
  "FaceSidePhoto_b64",
  "IdDocFontPhoto_b64",
  "IdDocRearPhoto_b64",
  "SignaturePhotoAttId64",
] as const satisfies (keyof SIMRegistrationPayload)[];

export async function apiSubmitSIMRegistration(
  payload: SIMRegistrationPayload,
  token: string,
): Promise<SIMRegistrationResponse> {
  const compressedPayload = { ...payload };

  for (const field of IMAGE_FIELDS) {
    const original = payload[field];
    if (original) {
      const compressed = await compressBase64Image(original);
      // console.log(`[Image Compression] ${field}:`, {
      //   before: b64SizeKB(original),
      //   after: b64SizeKB(compressed),
      //   reduction: `${((1 - compressed.replace(/^data:[^,]+,/, "").length / original.replace(/^data:[^,]+,/, "").length) * 100).toFixed(1)}%`,
      // });
      compressedPayload[field] = compressed;
    }
  }

  console.log("payload", compressedPayload);
  const { data } = await kycApi.post<SIMRegistrationResponse>(
    `/HTTP_FCDM_SIMRegistration_Add/`,
    compressedPayload,
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

  const response = await kycApi.post(
    `/HTTP_ValidateMRZFromOCR/`,
    form,
    {
      // baseURL: ENV.MRZ_API_BASE_URL,
      headers: {
        "Content-Type": undefined,
        Authorization: `Bearer ${token}`,
        SourceApp: "",
      },
    },
  );

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
console.log("String(selfieCropped)",String(selfieCropped))
  const { data } = await kycApi.post(
    "/HTTP_FaceMatching/",
    form,
    {
      headers: {
        "Content-Type": undefined,
        Authorization: `Bearer ${token}`,
        Login: ENV.API_LOGIN,
        SourceApp: "FCDM_App",
      },
    },
  );
  console.log("data for fac match", data?.Data)
  return data.Data;
}