// src/components/steps/OCRStep.tsx
//
// FR-007  KYC registration form
// FR-008  ID Number — mandatory, trimmed, validated per ID type
// FR-009  ID Type  — mandatory dropdown; drives field visibility
// FR-010  Name fields — first+last mandatory, middle optional, alpha only
// FR-011  Gender — mandatory controlled list (Male / Female)
// FR-012  Address — mandatory free text, min 5 chars

import { useState } from "react";
import type { ExtractedFields } from "../../types/kyc";

// ── Constants ──────────────────────────────────────────────────────────────────

export const ID_TYPES = ["Passport", "Voter ID", "Driver's License"] as const;
export type IdType = (typeof ID_TYPES)[number];

const GENDER_OPTIONS = ["Male", "Female"] as const;

const ID_TYPE_CONFIG: Record<
  IdType,
  {
    showExpiry: boolean;
    showNationality: boolean;
    idNumberPattern: RegExp;
    idNumberHint: string;
  }
> = {
  Passport: {
    showExpiry: true,
    showNationality: true,
    idNumberPattern: /^[A-Z0-9]{6,9}$/,
    idNumberHint: "6–9 alphanumeric characters (e.g. AB1234567)",
  },
  "Voter ID": {
    showExpiry: false,
    showNationality: false,
    idNumberPattern: /^[A-Z0-9\-]{5,20}$/,
    idNumberHint: "5–20 alphanumeric characters",
  },
  "Driver's License": {
    showExpiry: true,
    showNationality: false,
    idNumberPattern: /^[A-Z0-9\-]{5,20}$/,
    idNumberHint: "5–20 alphanumeric characters",
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface OCRStepProps {
  fields: ExtractedFields;
  setFields: React.Dispatch<React.SetStateAction<ExtractedFields>>;
  nextStep: () => void;
  prevStep: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitiseName(v: string) {
  return v.replace(/[^A-Za-zÀ-ÿ\s''-]/g, "");
}

function sanitiseIdNumber(v: string, idType: IdType): string {
  if (idType === "Passport") return v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return v.replace(/[^A-Z0-9\-]/gi, "").toUpperCase();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      {children}
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  hasError,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-100 bg-slate-900 outline-none transition-colors
        ${
          hasError
            ? "border-rose-500 focus:border-rose-400"
            : "border-slate-700 focus:border-cyan-500"
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OCRStep({
  fields,
  setFields,
  nextStep,
  prevStep,
}: OCRStepProps) {
  const [touched, setTouch] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // IdType lives in fields.IdType so it persists to session
  const idType: IdType =
    (fields.IdType as IdType) && ID_TYPES.includes(fields.IdType as IdType)
      ? (fields.IdType as IdType)
      : "Passport";

  const config = ID_TYPE_CONFIG[idType];

  // ── Field updaters ───────────────────────────────────────────────────────

  const update = (key: keyof ExtractedFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const touch = (key: string) => setTouch((prev) => ({ ...prev, [key]: true }));

  // ── Validation ───────────────────────────────────────────────────────────

  const errors: Record<string, string> = {};

  // ID Number — FR-008
  const idNum = fields.IdDocSerialNumber.trim();
  if (!idNum) errors.IdDocSerialNumber = "ID number is required.";
  else if (!config.idNumberPattern.test(idNum))
    errors.IdDocSerialNumber = `Invalid format. ${config.idNumberHint}`;

  // Name — FR-010
  if (!fields.FirstName.trim()) errors.FirstName = "First name is required.";
  else if (!/^[A-Za-zÀ-ÿ\s''-]+$/.test(fields.FirstName))
    errors.FirstName = "Letters only.";

  if (!fields.LastName.trim()) errors.LastName = "Last name is required.";
  else if (!/^[A-Za-zÀ-ÿ\s''-]+$/.test(fields.LastName))
    errors.LastName = "Letters only.";

  if (fields.MiddleName && !/^[A-Za-zÀ-ÿ\s''-]*$/.test(fields.MiddleName))
    errors.MiddleName = "Letters only.";

  // Gender — FR-011
  if (!fields.Gender) errors.Gender = "Gender is required.";

  // Address — FR-012
  if (!fields.Address.trim()) errors.Address = "Address is required.";
  else if (fields.Address.trim().length < 5)
    errors.Address = "Address is too short (min 5 characters).";

  // Expiry — only when visible per ID type
  if (config.showExpiry && !fields.ExpiryDate.trim())
    errors.ExpiryDate = "Expiry date is required for this document type.";

  const isValid = Object.keys(errors).length === 0;

  const show = (key: string) =>
    touched[key] || submitAttempted ? errors[key] : undefined;

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!isValid) return;
    nextStep();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-semibold">Your KYC details</h2>
        <p className="mt-1 text-sm text-slate-300">
          Enter your personal and identity information exactly as it appears on
          your ID document. All fields marked <span className="text-rose-400">*</span> are required.
        </p>
      </div>

      {/* ── Section 1: Identity document ────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Identity document
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* ID Type — FR-009 */}
          <Field label="ID Type" required>
            <select
              value={idType}
              onChange={(e) => {
                const next = e.target.value as IdType;
                update("IdType", next);
                update(
                  "IdDocSerialNumber",
                  sanitiseIdNumber(fields.IdDocSerialNumber, next),
                );
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 transition-colors"
            >
              {ID_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          {/* ID Number — FR-008 */}
          <Field label="ID Number" required error={show("IdDocSerialNumber")}>
            <TextInput
              value={fields.IdDocSerialNumber}
              onChange={(v) => {
                update("IdDocSerialNumber", sanitiseIdNumber(v, idType));
                touch("IdDocSerialNumber");
              }}
              placeholder={config.idNumberHint}
              hasError={!!show("IdDocSerialNumber")}
            />
          </Field>

          {/* Nationality — Passport only */}
          {config.showNationality && (
            <Field label="Nationality">
              <TextInput
                value={fields.Nationality}
                onChange={(v) => update("Nationality", v)}
                placeholder="e.g. Congolese"
              />
            </Field>
          )}

          {/* Expiry Date — Passport + Driver's License */}
          {config.showExpiry && (
            <Field label="Expiry Date" required error={show("ExpiryDate")}>
              <TextInput
                value={fields.ExpiryDate}
                onChange={(v) => {
                  update("ExpiryDate", v);
                  touch("ExpiryDate");
                }}
                placeholder="DD/MM/YYYY"
                hasError={!!show("ExpiryDate")}
              />
            </Field>
          )}
        </div>
      </div>

      {/* ── Section 2: Personal details ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Personal details
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* First name — FR-010 */}
          <Field label="First Name" required error={show("FirstName")}>
            <TextInput
              value={fields.FirstName}
              onChange={(v) => {
                update("FirstName", sanitiseName(v));
                touch("FirstName");
              }}
              placeholder="First name"
              hasError={!!show("FirstName")}
            />
          </Field>

          {/* Last name — FR-010 */}
          <Field label="Last Name" required error={show("LastName")}>
            <TextInput
              value={fields.LastName}
              onChange={(v) => {
                update("LastName", sanitiseName(v));
                touch("LastName");
              }}
              placeholder="Last name"
              hasError={!!show("LastName")}
            />
          </Field>

          {/* Middle name — FR-010, optional */}
          <Field label="Middle Name (optional)" error={show("MiddleName")}>
            <TextInput
              value={fields.MiddleName}
              onChange={(v) => {
                update("MiddleName", sanitiseName(v));
                touch("MiddleName");
              }}
              placeholder="Middle name"
              hasError={!!show("MiddleName")}
            />
          </Field>

          {/* Date of birth */}
          <Field label="Date of Birth">
            <TextInput
              value={fields.BirthDate}
              onChange={(v) => update("BirthDate", v)}
              placeholder="DD/MM/YYYY"
            />
          </Field>

          {/* Gender — FR-011 */}
          <Field label="Gender" required error={show("Gender")}>
            <select
              value={fields.Gender}
              onChange={(e) => {
                update("Gender", e.target.value);
                touch("Gender");
              }}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-100 bg-slate-900 outline-none transition-colors
                ${show("Gender") ? "border-rose-500" : "border-slate-700 focus:border-cyan-500"}`}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>

          {/* Email — optional */}
          <Field label="Email (optional)">
            <TextInput
              value={fields.Email}
              onChange={(v) => update("Email", v)}
              placeholder="email@example.com"
            />
          </Field>
        </div>

        {/* Address — FR-012, full width */}
        <Field label="Address" required error={show("Address")}>
          <textarea
            value={fields.Address}
            onChange={(e) => {
              update("Address", e.target.value);
              touch("Address");
            }}
            placeholder="Street, city, province / state, country"
            rows={3}
            className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm text-slate-100 bg-slate-900 outline-none transition-colors
              ${show("Address") ? "border-rose-500 focus:border-rose-400" : "border-slate-700 focus:border-cyan-500"}`}
          />
        </Field>
      </div>

      {/* ── Validation summary ───────────────────────────────────────────── */}
      {submitAttempted && !isValid && (
        <div className="rounded-2xl border border-rose-700/50 bg-rose-900/20 px-5 py-4">
          <p className="mb-2 text-sm font-medium text-rose-300">
            Please fix the following before continuing:
          </p>
          <ul className="space-y-1 text-xs text-rose-400">
            {Object.values(errors).map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
        <button
          onClick={prevStep}
          className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 hover:bg-cyan-400 transition-colors"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
