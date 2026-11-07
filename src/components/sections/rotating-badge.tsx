import { TrustSeal } from "./trust-seal";

export function RotatingBadge({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`} aria-hidden="true">
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full animate-spin-slow"
      >
        <defs>
          <path
            id="trademark-circle"
            d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"
          />
          <linearGradient id="gold-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdf0c2" />
            <stop offset="30%" stopColor="#f3d878" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="80%" stopColor="#a8841f" />
            <stop offset="100%" stopColor="#f0d584" />
          </linearGradient>
          <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.6" stdDeviation="0.4" floodColor="#3d2d0a" floodOpacity="0.4" />
          </filter>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="97"
          fill="none"
          stroke="#d4af37"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
        <circle
          cx="100"
          cy="100"
          r="58"
          fill="none"
          stroke="#d4af37"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <text
          fontSize="15"
          fontWeight="400"
          letterSpacing="2"
          textLength="500"
          lengthAdjust="spacingAndGlyphs"
          fill="url(#gold-plate)"
          stroke="#6b4f1a"
          strokeWidth="0.5"
          filter="url(#emboss)"
        >
          <textPath href="#trademark-circle">
            Deuvix AI Factory · Digital FTE · Secure · Trusted · AI Native ·
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <TrustSeal className="size-[38%]" color="#d4af37" />
      </div>
    </div>
  );
}
