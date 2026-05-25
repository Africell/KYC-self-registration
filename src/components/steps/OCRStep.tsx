import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { mapFieldKey } from "../../lib/utils";
import type { ExtractedFields } from "../../types/kyc";

interface OCRStepProps {
  fields: ExtractedFields;
  setFields: React.Dispatch<React.SetStateAction<ExtractedFields>>;
  runFaceMatch: () => Promise<void>;
  prevStep: () => void;
  mrzValid: boolean | null;
  mrzMessage: string;
  busy: boolean;
  docType: string;
}

type FieldRow = {
  label: string;
  labelKey: string;
  optional?: boolean;
  type?: "text" | "dropdown";
  options?: string[];
};

const GENDER_OPTIONS = ["Male", "Female"];

const FIELD_ROWS: FieldRow[] = [
  { label: "First name", labelKey: "ocr_field_first" },
  { label: "Middle name", labelKey: "ocr_field_middle", optional: true },
  { label: "Last name", labelKey: "ocr_field_last" },
  { label: "Email", labelKey: "ocr_field_email", optional: true },
  { label: "Address", labelKey: "ocr_field_address", optional: true },
  { label: "Document number", labelKey: "ocr_field_doc_number" },
  { label: "Nationality", labelKey: "ocr_field_nationality" },
  { label: "Birth date", labelKey: "ocr_field_birth" },
  { label: "Expiry date", labelKey: "ocr_field_expiry" },
  {
    label: "Gender",
    labelKey: "ocr_field_gender",
    type: "dropdown",
    options: GENDER_OPTIONS,
  },
];

const NATIONAL_ID_FIELD_ROWS: FieldRow[] = [
  { label: "First name", labelKey: "ocr_field_first" },
  { label: "Middle name", labelKey: "ocr_field_middle", optional: true },
  { label: "Last name", labelKey: "ocr_field_last" },
  { label: "ID number", labelKey: "ocr_field_doc_number" },
  { label: "Email", labelKey: "ocr_field_email", optional: true },
  { label: "Address", labelKey: "ocr_field_address", optional: true },
  { label: "Birth date", labelKey: "ocr_field_birth" },
  {
    label: "Gender",
    labelKey: "ocr_field_gender",
    type: "dropdown",
    options: GENDER_OPTIONS,
  },
];

const inputBase =
  "w-full rounded-xl border px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors bg-slate-800/60 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed";

function normalizeGender(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "m" || lower === "male") return "Male";
  if (lower === "f" || lower === "female") return "Female";
  return raw;
}

function fieldErrorKey(
  label: string,
  value: string,
  rows: FieldRow[],
): string | null {
  const row = rows.find((r) => r.label === label);
  if (!row || row.optional) return null;
  const val = value.trim();
  if (label === "Gender") {
    if (!val) return "ocr_error_gender";
    if (!GENDER_OPTIONS.includes(val)) return "ocr_error_gender_select";
    return null;
  }
  if (!val) return "ocr_error_required";
  return null;
}

export default function OCRStep({
  fields,
  setFields,
  runFaceMatch,
  prevStep,
  mrzValid,
  mrzMessage,
  busy,
  docType,
}: OCRStepProps) {
  const { t } = useTranslation();
  const activeFieldRows =
    docType === "national_id" ? NATIONAL_ID_FIELD_ROWS : FIELD_ROWS;

  // Capture which fields were populated by OCR on mount — those stay disabled.
  const [ocrFilledKeys] = useState<Set<keyof ExtractedFields>>(() => {
    const filled = new Set<keyof ExtractedFields>();
    for (const row of activeFieldRows) {
      const key = mapFieldKey(row.label) as keyof ExtractedFields;
      if (String(fields[key] ?? "").trim()) filled.add(key);
    }
    return filled;
  });

  const [touched, setTouched] = useState<Record<string, boolean>>(() => {
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (raw && !GENDER_OPTIONS.includes(normalized))
      return { [mapFieldKey("Gender")]: true };
    return {};
  });
  const [submitted, setSubmitted] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (normalized !== raw)
      setFields((prev) => ({ ...prev, Gender: normalized }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.Gender]);

  function getValue(label: string): string {
    const key = mapFieldKey(label) as keyof ExtractedFields;
    return String(fields[key] ?? "");
  }

  function showError(label: string): boolean {
    return submitted || !!touched[mapFieldKey(label)];
  }

  const hasErrors = activeFieldRows.some(
    (r) => fieldErrorKey(r.label, getValue(r.label), activeFieldRows) !== null,
  );

  function handleRunFaceMatch() {
    setSubmitted(true);
    if (hasErrors) return;
    void runFaceMatch();
  }

  const mrzColor =
    mrzValid === null
      ? "text-slate-400"
      : mrzValid
        ? "text-emerald-400"
        : "text-amber-400";
  const mrzLabel =
    mrzValid === null
      ? t("ocr_mrz_na")
      : mrzValid
        ? t("ocr_mrz_valid")
        : t("ocr_mrz_invalid");

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          {t("ocr_title")}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{t("ocr_subtitle")}</p>
      </div>

      {/* Fields grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {activeFieldRows.map(({ label, labelKey, optional, type, options }) => {
          const key = mapFieldKey(label) as keyof ExtractedFields;
          const isDisabled = ocrFilledKeys.has(key);
          const value = getValue(label);
          const errKey = fieldErrorKey(label, value, activeFieldRows);
          const showErr = !!errKey && showError(label);
          const borderClass = showErr
            ? "border-rose-500 focus:border-rose-400"
            : "border-slate-700 focus:border-cyan-500";

          const errorMsg =
            errKey === "ocr_error_required"
              ? t("ocr_error_required", { field: t(labelKey) })
              : errKey
                ? t(errKey)
                : null;

          return (
            <label key={label} className="block text-sm">
              <div className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t(labelKey)}
                {optional ? (
                  <span className="normal-case text-slate-600 font-normal">
                    {t("ocr_optional")}
                  </span>
                ) : (
                  <span className="text-rose-400">*</span>
                )}
              </div>

              {type === "dropdown" ? (
                <select
                  value={value}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, [key]: true }))
                  }
                  disabled={isDisabled}
                  className={`${inputBase} ${borderClass} ${isDisabled ? "" : "cursor-pointer"}`}
                >
                  <option value="">{t("ocr_select")}</option>
                  {options!.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "Male"
                        ? t("ocr_male")
                        : opt === "Female"
                          ? t("ocr_female")
                          : opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={value}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, [key]: true }))
                  }
                  disabled={isDisabled}
                  className={`${inputBase} ${borderClass}`}
                />
              )}

              {showErr && (
                <p className="mt-1 text-xs text-rose-400">{errorMsg}</p>
              )}
            </label>
          );
        })}
      </div>

      {/* MRZ/OCR status */}
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">
            {docType === "national_id"
              ? t("ocr_label_ocr")
              : t("ocr_label_mrz")}
          </span>
          <span className={`font-medium ${mrzColor}`}>{mrzLabel}</span>
          {mrzMessage && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              — {mrzMessage}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2"
        >
          {showRaw ? t("ocr_hide") : t("ocr_show")} {t("ocr_raw_suffix")}
        </button>
      </div>

      {/* Collapsible raw panels */}
      {showRaw && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("ocr_raw_mrz_title")}
            </p>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 whitespace-pre-wrap max-h-40">
              {fields.rawMRZ || t("ocr_raw_mrz_empty")}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("ocr_raw_ocr_title")}
            </p>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 whitespace-pre-wrap max-h-40">
              {fields.rawOCRText || t("ocr_raw_ocr_empty")}
            </pre>
          </div>
        </div>
      )}

      {submitted && hasErrors && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {t("ocr_error_fill")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-4">
        <button
          onClick={prevStep}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t("back")}
        </button>
        <button
          onClick={handleRunFaceMatch}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              {t("ocr_running")}
            </>
          ) : (
            t("next")
          )}
        </button>
      </div>
    </section>
  );
}
