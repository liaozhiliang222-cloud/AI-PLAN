export function LogoBadge({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  const initial = name.replace(/[^A-Za-z\u4e00-\u9fa5]/g, "").slice(0, 1).toUpperCase() || "AI";
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.45 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
