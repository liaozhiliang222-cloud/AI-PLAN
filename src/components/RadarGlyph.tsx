export function RadarGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#DBEAFE" strokeWidth="1.6" opacity="0.85" />
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <path d="M16 16 L24.5 11.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}
