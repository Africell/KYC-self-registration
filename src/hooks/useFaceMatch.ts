import { useCallback, useState } from "react";
import { apiFaceMatch } from "../lib/api/kyc.api";
import { getStoredToken } from "../lib/services/msisdn.service";
import { cropFaceToDataUrl } from "../lib/services/face.service";
import { dataUrlToImage } from "../utils/image";
import type { FaceMatchResult } from "../types/kyc";
import type { KYCSession } from "../lib/services/session.service";

interface UseFaceMatchProps {
  selfieImage: string;
  documentImage: string;
  pushError: (scope: string, message: string) => void;
  clearError: () => void;
  nextStep: () => void;
  expireSession: (message: string) => void;
}

interface UseFaceMatchReturn {
  faceMatch: FaceMatchResult | null;
  busy: boolean;
  runFaceMatch: () => Promise<void>;
  rehydrateFaceMatch: (s: Pick<KYCSession, "faceMatch">) => void;
  resetFaceMatch: () => void;
}

export function useFaceMatch({
  selfieImage,
  documentImage,
  pushError,
  clearError,
  nextStep,
  expireSession,
}: UseFaceMatchProps): UseFaceMatchReturn {
  const [faceMatch, setFaceMatch] = useState<FaceMatchResult | null>(null);
  const [busy, setBusy]           = useState(false);

  const runFaceMatch = useCallback(async (): Promise<void> => {
    if (!selfieImage || !documentImage) {
      pushError("face-match", "Selfie and document image are both required.");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      expireSession("Session expired. Please restart the registration.");
      return;
    }

    try {
      clearError();
      setBusy(true);

      const selfieImg = await dataUrlToImage(selfieImage);
      const { dataUrl: croppedSelfie, cropped: selfieCropped } = await cropFaceToDataUrl(selfieImg);

      const api = await apiFaceMatch(documentImage, croppedSelfie, selfieCropped, token);

      const result: FaceMatchResult = {
        result: api.result,
        similarity: api.similarity,
        confidence_level: api.confidence_level,
        threshold: api.threshold,
        doc_mp_aligned: api.doc_mp_aligned,
        photo_mp_aligned: api.photo_mp_aligned,
        passed: api.result === "match",
        status: api.result === "match" ? "pass" : "review",
      };

      setFaceMatch(result);
      nextStep();
    } catch (err) {
      pushError(
        "face-match",
        err instanceof Error
          ? `${err.message} Ensure both images contain one clear face.`
          : "Face match failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [selfieImage, documentImage, pushError, clearError, nextStep]);

  const rehydrateFaceMatch = useCallback(
    (s: Pick<KYCSession, "faceMatch">) => {
      if (s.faceMatch) setFaceMatch(s.faceMatch);
    },
    [],
  );

  const resetFaceMatch = useCallback(() => {
    setFaceMatch(null);
  }, []);

  return {
    faceMatch,
    busy,
    runFaceMatch,
    rehydrateFaceMatch,
    resetFaceMatch,
  };
}
