import { useEffect, useState } from "react";
import { loadSession, getOTPTokenExpiry } from "../lib/services/session.service";

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export interface SessionTimers {
  sessionTimeLeft: string;
  otpTimeLeft: string;
  sessionExpired: boolean;
  otpExpired: boolean;
}

export function useSessionTimers(): SessionTimers {
  const [sessionTimeLeft, setSessionTimeLeft] = useState("00:00");
  const [otpTimeLeft, setOtpTimeLeft] = useState("00:00");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();

      // KYC session
      const session = loadSession();
      if (session) {
        const diff = session.expiresAt - now;
        setSessionTimeLeft(formatTimeLeft(diff));
        setSessionExpired(diff <= 0);
      } else {
        setSessionTimeLeft("00:00");
        setSessionExpired(true);
      }

      // OTP token
      const otpExpiry = getOTPTokenExpiry();
      if (otpExpiry !== null) {
        const diff = otpExpiry - now;
        setOtpTimeLeft(formatTimeLeft(diff));
        setOtpExpired(diff <= 0);
      } else {
        setOtpTimeLeft("00:00");
        setOtpExpired(false); // not expired — just doesn't exist yet
      }
    }

    tick(); // run immediately
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return { sessionTimeLeft, otpTimeLeft, sessionExpired, otpExpired };
}