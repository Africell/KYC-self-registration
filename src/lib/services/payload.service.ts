import type {
  DocumentQuality,
  ExtractedFields,
  SubmissionPayload,
} from "../../types/kyc";

export function buildPayload(args: {
  consentAccepted: boolean;
  selfieVideoRef: string;
  documentImage: string;
  documentBackImage: string;
  signatureImage: string;
  documentQuality: DocumentQuality | null;
  fields: ExtractedFields;
  mrzValid: boolean | null;
  mrzMessage: string;
  registrationReference: string;
}): SubmissionPayload {
  const {
    consentAccepted,
    selfieVideoRef,
    documentImage,
    documentBackImage,
    signatureImage,
    documentQuality,
    fields,
    mrzValid,
    mrzMessage,
    registrationReference,
  } = args;

  const readyForBackendPost = Boolean(
    consentAccepted &&
      selfieVideoRef &&
      documentImage &&
      signatureImage &&
      fields.FirstName.trim() &&
      fields.LastName.trim() &&
      fields.IdDocSerialNumber.trim() &&
      fields.Gender &&
      fields.Address.trim(),
  );

  return {
    consentAccepted,
    capturedAt: new Date().toISOString(),
    images: {
      selfieVideoRef,
      IdDocFrontPhoto_b64: documentImage,
      IdDocRearPhoto_b64: documentBackImage,
      signaturePhoto_b64: signatureImage,
    },
    documentQuality,
    ocr: fields,
    mrz: {
      valid: mrzValid,
      message: mrzMessage,
    },
    registrationReference,
    readyForBackendPost,
  };
}
