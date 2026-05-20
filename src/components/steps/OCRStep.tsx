import { useEffect, useState } from "react";
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
}

type FieldRow = {
  label: string;
  optional?: boolean;
  type?: "text" | "dropdown";
  options?: string[];
};

const GENDER_OPTIONS = ["Male", "Female"];

const FIELD_ROWS: FieldRow[] = [
  { label: "First name" },
  { label: "Middle name", optional: true },
  { label: "Last name" },
  { label: "Email" },
  { label: "Address" },
  { label: "Document number" },
  { label: "Nationality" },
  { label: "Birth date" },
  { label: "Expiry date" },
  { label: "Gender", type: "dropdown", options: GENDER_OPTIONS },
];

const inputBase =
  "w-full rounded-xl border px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors bg-slate-800/60 focus:ring-2 focus:ring-cyan-400/20";

function normalizeGender(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "m" || lower === "male") return "Male";
  if (lower === "f" || lower === "female") return "Female";
  return raw;
}

function fieldError(label: string, value: string): string | null {
  const row = FIELD_ROWS.find((r) => r.label === label)!;
  if (row.optional) return null;
  const val = value.trim();
  if (label === "Gender") {
    if (!val) return "Gender is required";
    if (!GENDER_OPTIONS.includes(val)) return "Please select gender";
    return null;
  }
  if (!val) return `${label} is required`;
  return null;
}

export default function OCRStep({ fields, setFields, runFaceMatch, prevStep, mrzValid, mrzMessage, busy }: OCRStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>(() => {
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (raw && !GENDER_OPTIONS.includes(normalized)) return { [mapFieldKey("Gender")]: true };
    return {};
  });
  const [submitted, setSubmitted] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (normalized !== raw) setFields((prev) => ({ ...prev, Gender: normalized }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.Gender]);

  function getValue(label: string): string {
    const key = mapFieldKey(label) as keyof ExtractedFields;
    return String(fields[key] ?? "");
  }

  function showError(label: string): boolean {
    return submitted || !!touched[mapFieldKey(label)];
  }

  const hasErrors = FIELD_ROWS.some((r) => fieldError(r.label, getValue(r.label)) !== null);

  function handleRunFaceMatch() {
    setSubmitted(true);
    if (hasErrors) return;
    void runFaceMatch();
  }

  const mrzColor = mrzValid === null ? "text-slate-400" : mrzValid ? "text-emerald-400" : "text-amber-400";
  const mrzLabel = mrzValid === null ? "Not available" : mrzValid ? "Valid" : "Invalid or partial";

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Review extracted data</h2>
        <p className="mt-1 text-sm text-slate-400">
          Check and correct the fields below. All fields except Middle name are required.
        </p>
      </div>

      {/* Fields grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELD_ROWS.map(({ label, optional, type, options }) => {
          const key = mapFieldKey(label) as keyof ExtractedFields;
          const value = getValue(label);
          const error = fieldError(label, value);
          const showErr = !!error && showError(label);
          const borderClass = showErr
            ? "border-rose-500 focus:border-rose-400"
            : "border-slate-700 focus:border-cyan-500";

          return (
            <label key={label} className="block text-sm">
              <div className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
                {optional
                  ? <span className="normal-case text-slate-600 font-normal">(optional)</span>
                  : <span className="text-rose-400">*</span>
                }
              </div>

              {type === "dropdown" ? (
                <select
                  value={value}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, [key]: true }))}
                  className={`${inputBase} ${borderClass} cursor-pointer`}
                >
                  <option value="">— Select —</option>
                  {options!.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  value={value}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, [key]: true }))}
                  className={`${inputBase} ${borderClass}`}
                />
              )}

              {showErr && <p className="mt-1 text-xs text-rose-400">{error}</p>}
            </label>
          );
        })}
      </div>

      {/* MRZ status (compact) */}
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">MRZ:</span>
          <span className={`font-medium ${mrzColor}`}>{mrzLabel}</span>
          {mrzMessage && <span className="text-xs text-slate-500 hidden sm:inline">— {mrzMessage}</span>}
        </div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2"
        >
          {showRaw ? "Hide" : "Show"} raw data
        </button>
      </div>

      {/* Collapsible raw panels */}
      {showRaw && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Raw MRZ</p>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 whitespace-pre-wrap max-h-40">
              {fields.rawMRZ || "No MRZ extracted."}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Raw OCR text</p>
            <pre className="overflow-auto rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 whitespace-pre-wrap max-h-40">
              {fields.rawOCRText || "No OCR text available."}
            </pre>
          </div>
        </div>
      )}

      {submitted && hasErrors && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Please fill in all required fields before continuing.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-4">
        <button
          onClick={prevStep}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <button
          onClick={handleRunFaceMatch}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              Running…
            </>
          ) : (
            <p>
             
             Next
            </p>
          )}
        </button>
      </div>
    </section>
  );
}
