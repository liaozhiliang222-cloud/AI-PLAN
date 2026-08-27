export function Sparkline({ values, width = 64, height = 20 }: { values: number[]; width?: number; height?: number }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 2;
  const n = values.length;
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = values[n - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="inline-block align-middle">
      <path d={d} fill="none" stroke={up ? "#059669" : "#dc2626"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
