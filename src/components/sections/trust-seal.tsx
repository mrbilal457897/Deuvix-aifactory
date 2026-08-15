export function TrustSeal({
  className,
  color = "#2563EB",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="29.5" stroke={color} strokeWidth="1.5" opacity="0.15" />
      <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="2.5" />
      <path
        d="M32 20 L44 25.5 V34 C44 42.5 38.5 48 32 50.5 C25.5 48 20 42.5 20 34 V25.5 Z"
        fill="#FFFFFF"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M27.5 33.5 L31.5 37.5 L38 29"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
