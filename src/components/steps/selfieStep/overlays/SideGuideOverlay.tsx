import { useTranslation } from "react-i18next";
import { GUIDE_CX, GUIDE_CY, GUIDE_RX, GUIDE_RY } from "../selfie.constants";

interface SideGuideOverlayProps {
  yawProgress: number; // 0–1
  isReady:     boolean;
  countdown:   number; // 1–3 when counting down
}

const ARC_R    = 18;
const ARC_CIRC = 2 * Math.PI * ARC_R;

// Countdown ring uses the same ellipse geometry as the oval, slightly inset
const RING_RX = GUIDE_RX + 2.5;
const RING_RY = GUIDE_RY + 2.5;
const RING_CIRC = 2 * Math.PI * Math.max(RING_RX, RING_RY); // approx

export function SideGuideOverlay({ yawProgress, isReady, countdown }: SideGuideOverlayProps) {
  const { t } = useTranslation();
  const arcFill = yawProgress * ARC_CIRC;
  const color   = isReady ? "#34d399" : "#22d3ee";

  // Countdown ring dash: full at 3s, empty at 0s
  const ringFraction = countdown / 3;
  const ringDash = ringFraction * RING_CIRC;

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes arrowBounce { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
        .arrow-bounce { animation: arrowBounce 1s ease-in-out infinite; transform-box:fill-box; transform-origin:center }
        @keyframes ringPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .ring-pulse { animation: ringPulse 0.9s ease-in-out infinite; }
      `}</style>

      {/* Dim surround */}
      <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.35)" />

      {/* Arc track */}
      <ellipse cx={GUIDE_CX} cy={GUIDE_CY} rx={ARC_R + 2} ry={GUIDE_RY + 2}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

      {/* Arc fill */}
      <ellipse cx={GUIDE_CX} cy={GUIDE_CY} rx={ARC_R + 2} ry={GUIDE_RY + 2}
        fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray={`${arcFill} ${ARC_CIRC}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.3s ease, stroke 0.4s", transform: "rotate(-90deg)", transformOrigin: `${GUIDE_CX}% ${GUIDE_CY}%`, transformBox: "fill-box" }}
      />

      {/* Pulsing countdown ring (only when counting down) */}
      {isReady && (
        <ellipse
          cx={GUIDE_CX} cy={GUIDE_CY} rx={RING_RX} ry={RING_RY}
          fill="none" stroke="#34d399" strokeWidth="1.2"
          strokeDasharray={`${ringDash} ${RING_CIRC}`} strokeLinecap="round"
          className="ring-pulse"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: `${GUIDE_CX}% ${GUIDE_CY}%`,
            transformBox: "fill-box",
            transition: "stroke-dasharray 0.9s linear",
          }}
        />
      )}

      {/* Oval border */}
      <ellipse cx={GUIDE_CX} cy={GUIDE_CY} rx={GUIDE_RX} ry={GUIDE_RY}
        fill={isReady ? "rgba(52,211,153,0.06)" : "rgba(34,211,238,0.05)"}
        stroke={color} strokeWidth="0.6"
        style={{ transition: "stroke 0.4s, fill 0.4s" }} />

      {/* Countdown number (ready) or bouncing arrow (not ready) */}
      {!isReady ? (
        <g className="arrow-bounce">
          <text x={GUIDE_CX + GUIDE_RX + 5} y={GUIDE_CY + 1.5}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill="#22d3ee" opacity="0.9">→</text>
        </g>
      ) : (
        <text
          x={GUIDE_CX} y={GUIDE_CY + 1.5}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="16" fontWeight="bold" fill="#34d399" opacity="0.95"
          style={{ transition: "fill 0.3s" }}
        >
          {countdown}
        </text>
      )}

      {/* Label below oval */}
      <text x={GUIDE_CX} y={GUIDE_CY + GUIDE_RY + 6} textAnchor="middle"
        fontSize="3.2" fill={color} fontFamily="system-ui, sans-serif"
        fontWeight="500" opacity="0.9" style={{ transition: "fill 0.4s" }}>
        {isReady ? t("selfie_side_hold_still") : t("selfie_side_turn_right")}
      </text>
    </svg>
  );
}
