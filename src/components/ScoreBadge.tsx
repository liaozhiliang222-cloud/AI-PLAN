import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function TrendBadge({ trend, className = "" }: { trend: number | null | undefined; className?: string }) {
  if (!trend) {
    return <span className={`inline-flex items-center text-xs text-gray-400 ${className}`}>–</span>;
  }
  const up = trend > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium num ${up ? "text-emerald-600" : "text-red-600"} ${className}`}
    >
      <Icon size={13} strokeWidth={2.5} />
      {Math.abs(trend)}
    </span>
  );
}

/** 分数徽章：分值越高越蓝，<70 灰 */
export function ScoreBadge({ value, label, size = "md", muted }: { value: number | null | undefined; label?: string; size?: "sm" | "md" | "lg"; muted?: boolean }) {
  const v = value ?? 0;
  const tone = v >= 88 ? "bg-blue-600 text-white" : v >= 78 ? "bg-blue-50 text-blue-700 border border-blue-200" : v >= 70 ? "bg-gray-50 text-gray-600 border border-gray-200" : "bg-gray-50 text-gray-400 border border-gray-200";
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-xl" };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`num inline-flex items-center justify-center rounded-lg font-semibold ${tone} ${sizes[size]}`}>
        {value == null ? "–" : Math.round(v)}
      </span>
      {label && <span className={`text-[10px] leading-none ${muted ? "text-gray-400" : "text-gray-500"}`}>{label}</span>}
    </div>
  );
}
