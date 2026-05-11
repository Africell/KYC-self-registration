import { useEffect, useState } from "react";
import { mapFieldKey } from "../../lib/utils";
import type { ExtractedFields } from "../../types/kyc";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Field config ──────────────────────────────────────────────────────────────

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
  "w-full rounded-xl border px-3 py-2 text-slate-100 outline-none transition-colors bg-slate-900";

// ── Gender normalisation ──────────────────────────────────────────────────────

function normalizeGender(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "m" || lower === "male") return "Male";
  if (lower === "f" || lower === "female") return "Female";
  return raw;
}

// ── Validation ────────────────────────────────────────────────────────────────

function fieldError(label: string, value: string): string | null {
  const row = FIELD_ROWS.find((r) => r.label === label)!;
  if (row.optional) return null;

  const val = value.trim();

  if (label === "Gender") {
    if (!val) return "Gender is required";
    if (!GENDER_OPTIONS.includes(val))
      return "Please select gender";
    return null;
  }

  if (!val) return `${label} is required`;
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OCRStep({
  fields,
  setFields,
  runFaceMatch,
  prevStep,
  mrzValid,
  mrzMessage,
  busy,
}: OCRStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>(() => {
    // Pre-mark gender as touched only when OCR gave a value that is still
    // unrecognised after normalisation (e.g. random garbage text).
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (raw && !GENDER_OPTIONS.includes(normalized)) {
      return { [mapFieldKey("Gender")]: true };
    }
    return {};
  });
  const [submitted, setSubmitted] = useState(false);

  // Auto-normalise common OCR variants ("M"/"m"/"male" → "Male", etc.)
  useEffect(() => {
    const raw = String(fields.Gender ?? "").trim();
    const normalized = normalizeGender(raw);
    if (normalized !== raw) {
      setFields((prev) => ({ ...prev, Gender: normalized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.Gender]);

  function getValue(label: string): string {
    const key = mapFieldKey(label) as keyof ExtractedFields;
    return String(fields[key] ?? "");
  }

  function showError(label: string): boolean {
    return submitted || !!touched[mapFieldKey(label)];
  }

  const hasErrors = FIELD_ROWS.some(
    (r) => fieldError(r.label, getValue(r.label)) !== null,
  );

  function handleRunFaceMatch() {
    setSubmitted(true);
    if (hasErrors) return;
    void runFaceMatch();
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">OCR and MRZ results</h2>
        <p className="mt-1 text-sm text-slate-300">
          Review and correct the extracted fields. All fields except Middle name
          are required before running the face comparison.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELD_ROWS.map(({ label, optional, type, options }) => {
          const key = mapFieldKey(label) as keyof ExtractedFields;
          const value = getValue(label);
          const error = fieldError(label, value);
          const showErr = !!error && showError(label);
          const borderClass = showErr
            ? "border-rose-500 focus:border-rose-400"
            : "border-slate-700 focus:border-cyan-500";

          return (
            <label key={label} className="block text-sm text-slate-300">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                {label}{" "}
                {optional ? (
                  <span className="text-slate-600 normal-case">(optional)</span>
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
                  className={`${inputBase} ${borderClass} cursor-pointer`}
                >
                  <option value="">— Select —</option>
                  {options!.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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
                  className={`${inputBase} ${borderClass}`}
                />
              )}

              {showErr && (
                <p className="mt-1 text-xs text-rose-400">{error}</p>
              )}
            </label>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            MRZ validation
          </div>
          <div>
            Status:{" "}
            {mrzValid === null ? (
              <span className="text-slate-400">Not available</span>
            ) : mrzValid ? (
              <span className="text-emerald-300">Valid</span>
            ) : (
              <span className="text-amber-300">Invalid or partial</span>
            )}
          </div>
          <div className="mt-2 text-slate-200">
            {mrzMessage || "No MRZ message."}
          </div>
          <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-200">
            {fields.rawMRZ || "No MRZ extracted."}
          </pre>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Raw OCR text
          </div>
          <pre className="overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-200 whitespace-pre-wrap">
            {fields.rawOCRText || "No OCR text available."}
          </pre>
        </div>
      </div>

      {submitted && hasErrors && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Please fill in all required fields before continuing.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={prevStep}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleRunFaceMatch}
          disabled={busy}
          className="rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950
            hover:bg-cyan-400 transition-colors
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
              Running…
            </span>
          ) : (
            "Run face match"
          )}
        </button>
      </div>
    </section>
  );
}
