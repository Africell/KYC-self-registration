// src/hooks/useKYCFlow.ts

import { useCallback, useEffect, useState } from "react";
import { steps } from "../lib/constants/kyc.constants";
import { loadSession, saveSession, clearSession } from "../lib/services/session.service";
import type { AppError, StepKey } from "../types/kyc";

interface UseKYCFlowReturn {
  stepIndex: number;
  activeStep: (typeof steps)[number];
  error: AppError | null;
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  pushError: (scope: string, message: string) => void;
  clearError: () => void;
  resetFlow: (extras?: () => void) => void;
}

function resolveInitialIndex(): number {
  const session = loadSession();
  if (!session) return 0;
  const idx = steps.findIndex((s) => s.key === session.stepKey);
  return idx >= 0 ? idx : 0;
}

export function useKYCFlow(): UseKYCFlowReturn {
  const [stepIndex, setStepIndex] = useState(resolveInitialIndex);
  const [error, setError] = useState<AppError | null>(null);
  const [agreed, setAgreedState] = useState(() => {
    return loadSession()?.agreed ?? false;
  });

  // Persist step key whenever stepIndex changes
  useEffect(() => {
    const key = steps[stepIndex]?.key as StepKey;
    if (key) saveSession({ stepKey: key });
  }, [stepIndex]);

  const setAgreed = useCallback((v: boolean) => {
    setAgreedState(v);
    saveSession({ agreed: v });
  }, []);

  const pushError = useCallback((scope: string, message: string) => {
    setError({ scope, message });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const nextStep = useCallback(() => {
    clearError();
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [clearError]);

  const prevStep = useCallback(() => {
    clearError();
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, [clearError]);

  const resetFlow = useCallback(
    (extras?: () => void) => {
      clearError();
      clearSession();
      setStepIndex(0);
      setAgreedState(false);
      extras?.();
    },
    [clearError],
  );

  const activeStep = steps[stepIndex] ?? steps[0];

  return {
    stepIndex,
    activeStep,
    error,
    agreed,
    setAgreed,
    nextStep,
    prevStep,
    pushError,
    clearError,
    resetFlow,
  };
}
