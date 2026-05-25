
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import type { RefObject } from "react";
import Webcam from "react-webcam";

import { analyzeDocumentQuality } from "../lib/quality";
import { detectPossibleSpoof }    from "../lib/services/spoof.service";
import { compressBase64Image, COMPRESS_DOCUMENT, COMPRESS_PNG_ONLY } from "../lib/api/kyc.api";
import {
  fileToDataUrl,
  dataUrlToImage,
  getCanvasFromImage,
  canvasToBlob,
} from "../utils/image";
import type { DocumentQuality } from "../types/kyc";
import type { KYCSession }      from "../lib/services/session.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseDocumentProps {
  docWebcamRef: RefObject<Webcam | null>;
  pushError:    (scope: string, message: string) => void;
  clearError:   () => void;
}

interface UseDocumentReturn {
  documentImage:              string;
  documentQuality:            DocumentQuality | null;
  documentBackImage:          string;
  documentBackQuality:        DocumentQuality | null;
  documentPreviewMode:        "camera" | "upload";
  setDocumentPreviewMode:     (mode: "camera" | "upload") => void;
  captureDocument:            () => Promise<void>;
  captureDocumentBack:        () => Promise<void>;
  handleDocumentUpload:       (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDocumentBackUpload:   (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDocumentDropFile:     (file: File) => Promise<void>;
  handleDocumentBackDropFile: (file: File) => Promise<void>;
  documentUploading:          boolean;
  documentBackUploading:      boolean;
  saveDocumentBlobLocally:    () => Promise<void>;
  saveDocumentBackBlobLocally: () => Promise<void>;
  rehydrateDocument: (
    s: Pick<KYCSession, "documentImage" | "documentBackImage" | "documentQuality" | "documentBackQuality">
  ) => void;
  resetDocument: () => void;
}

type DocumentSide = "front" | "back";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDocument({
  docWebcamRef,
  pushError,
  clearError,
}: UseDocumentProps): UseDocumentReturn {
  const [documentImage,       setDocumentImage]       = useState("");
  const [documentQuality,     setDocumentQuality]     = useState<DocumentQuality | null>(null);
  const [documentBackImage,   setDocumentBackImage]   = useState("");
  const [documentBackQuality, setDocumentBackQuality] = useState<DocumentQuality | null>(null);
  const [documentPreviewMode,    setDocumentPreviewMode]    = useState<"camera" | "upload">("upload");
  const [documentUploading,      setDocumentUploading]      = useState(false);
  const [documentBackUploading,  setDocumentBackUploading]  = useState(false);

  // ── Setters by side ───────────────────────────────────────────────────────
  // Keyed helpers so the shared logic below doesn't need separate branches.

  const setImage   = useCallback((side: DocumentSide, dataUrl: string) => {
    if (side === "front") setDocumentImage(dataUrl);
    else                  setDocumentBackImage(dataUrl);
  }, []);

  const setQuality = useCallback((side: DocumentSide, q: DocumentQuality) => {
    if (side === "front") setDocumentQuality(q);
    else                  setDocumentBackQuality(q);
  }, []);

  // ── Shared: capture from webcam ───────────────────────────────────────────
  const captureFromWebcam = useCallback(async (): Promise<string> => {
    if (!docWebcamRef.current) throw new Error("Webcam not ready.");
    const dataUrl = docWebcamRef.current.getScreenshot({ width: 1920, height: 1080 });
    if (!dataUrl) throw new Error("Could not capture image from webcam.");
    return dataUrl;
  }, [docWebcamRef]);

  // ── Shared: capture + analyse ─────────────────────────────────────────────
  const captureAndAnalyze = useCallback(
    async (side: DocumentSide): Promise<void> => {
      const errorScope = side === "front" ? "document" : "document-back";
      try {
        clearError();
        const dataUrl = await captureFromWebcam();

        const spoof = await detectPossibleSpoof(dataUrl);
        if (spoof) {
          pushError("security", "Possible screen/replay attack detected.");
          return;
        }

        const quality = await analyzeDocumentQuality(dataUrl);
        const compressed = await compressBase64Image(dataUrl, COMPRESS_DOCUMENT);
        setImage(side, compressed);
        setQuality(side, quality);
      } catch (err) {
        pushError(
          errorScope,
          err instanceof Error ? err.message : `${side} document capture failed.`,
        );
      }
    },
    [captureFromWebcam, pushError, clearError, setImage, setQuality],
  );

  const setUploading = useCallback((side: DocumentSide, val: boolean) => {
    if (side === "front") setDocumentUploading(val);
    else                  setDocumentBackUploading(val);
  }, []);

  // ── Shared: upload + analyse ──────────────────────────────────────────────
  const processFile = useCallback(
    async (side: DocumentSide, file: File): Promise<void> => {
      const errorScope   = side === "front" ? "document" : "document-back";
      const qualityScope = side === "front" ? "document-quality" : "document-back-quality";
      flushSync(() => setUploading(side, true));
      try {
        clearError();

        const dataUrl    = await fileToDataUrl(file);
        const docQuality = await analyzeDocumentQuality(dataUrl);

        const isPng   = file.type === "image/png";
        const isLarge = file.size > 5 * 1024 * 1024;

        let finalUrl = dataUrl;
        if (isPng || isLarge) {
          finalUrl = await compressBase64Image(
            dataUrl,
            isPng && !isLarge ? COMPRESS_PNG_ONLY : COMPRESS_DOCUMENT,
          );
        }

        setImage(side, finalUrl);
        setQuality(side, docQuality);

        if (!docQuality.looksUsefulForOCR) {
          pushError(qualityScope, docQuality.reasons[0] ?? "Image quality may affect OCR accuracy.");
        }
      } catch (err) {
        pushError(
          errorScope,
          err instanceof Error ? err.message : `Could not read uploaded ${side} document image.`,
        );
      } finally {
        setUploading(side, false);
      }
    },
    [clearError, pushError, setImage, setQuality, setUploading],
  );

  const handleUpload = useCallback(
    async (side: DocumentSide, e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processFile(side, file);
    },
    [processFile],
  );

  // ── Shared: save locally ──────────────────────────────────────────────────
  const saveLocally = useCallback(
    async (dataUrl: string, filename: string): Promise<void> => {
      const image  = await dataUrlToImage(dataUrl);
      const canvas = getCanvasFromImage(image);
      const blob   = await canvasToBlob(canvas);
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href     = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  // ── Public API ────────────────────────────────────────────────────────────

  const captureDocument      = useCallback(() => captureAndAnalyze("front"), [captureAndAnalyze]);
  const captureDocumentBack  = useCallback(() => captureAndAnalyze("back"),  [captureAndAnalyze]);

  const handleDocumentUpload      = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpload("front", e),
    [handleUpload],
  );
  const handleDocumentBackUpload  = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpload("back", e),
    [handleUpload],
  );
  const handleDocumentDropFile     = useCallback(
    (file: File) => processFile("front", file),
    [processFile],
  );
  const handleDocumentBackDropFile = useCallback(
    (file: File) => processFile("back", file),
    [processFile],
  );

  const saveDocumentBlobLocally = useCallback(async () => {
    if (!documentImage) return;
    try {
      await saveLocally(documentImage, `document-front-${Date.now()}.jpg`);
    } catch (err) {
      pushError("document", err instanceof Error ? err.message : "Failed to save front document.");
    }
  }, [documentImage, saveLocally, pushError]);

  const saveDocumentBackBlobLocally = useCallback(async () => {
    if (!documentBackImage) return;
    try {
      await saveLocally(documentBackImage, `document-back-${Date.now()}.jpg`);
    } catch (err) {
      pushError("document-back", err instanceof Error ? err.message : "Failed to save back document.");
    }
  }, [documentBackImage, saveLocally, pushError]);

  // ── Rehydrate ─────────────────────────────────────────────────────────────
  const rehydrateDocument = useCallback(
    (s: Pick<KYCSession, "documentImage" | "documentBackImage" | "documentQuality" | "documentBackQuality">) => {
      if (s.documentImage)       setDocumentImage(s.documentImage);
      if (s.documentBackImage)   setDocumentBackImage(s.documentBackImage);
      if (s.documentQuality)     setDocumentQuality(s.documentQuality);
      if (s.documentBackQuality) setDocumentBackQuality(s.documentBackQuality);
    },
    [],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetDocument = useCallback(() => {
    setDocumentImage("");
    setDocumentQuality(null);
    setDocumentBackImage("");
    setDocumentBackQuality(null);
    setDocumentPreviewMode("camera");
  }, []);

  return {
    documentImage,
    documentQuality,
    documentBackImage,
    documentBackQuality,
    documentPreviewMode,
    setDocumentPreviewMode,
    captureDocument,
    captureDocumentBack,
    handleDocumentUpload,
    handleDocumentBackUpload,
    handleDocumentDropFile,
    handleDocumentBackDropFile,
    documentUploading,
    documentBackUploading,
    saveDocumentBlobLocally,
    saveDocumentBackBlobLocally,
    rehydrateDocument,
    resetDocument,
  };
}