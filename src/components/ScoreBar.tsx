import { stars } from "@/lib/format";

/** 横向评分条 */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 88 ? "#2563EB" : value >= 75 ? "#60A5FA" : value >= 60 ? "#93C5FD" : "#D1D5DB";
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="meter flex-1"><span style={{ width: `${value}%`, background: tone }} /></div>
      <span className="num w-7 text-right text-sm font-semibold text-gray-800">{Math.round(value)}</span>
    </div>
  );
}

export function StarRow({ level }: { level: number }) {
  return <span className="text-blue-600 tracking-widest text-sm">{stars(level)}</span>;
}
