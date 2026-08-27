import type { ChangeLog } from "@prisma/client";
import { IMPORTANCE, CHANGE_TYPES, SOURCE_TYPE } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import Link from "next/link";

export function ChangeItem({ change, nowMs }: { change: ChangeLog; nowMs: number }) {
  const imp = IMPORTANCE[change.importance as keyof typeof IMPORTANCE] || IMPORTANCE.minor;
  const major = change.importance === "major";
  const href =
    change.entityType === "plan" && change.entitySlug
      ? `/plans/${change.entitySlug}`
      : change.entityType === "model" && change.entitySlug
        ? `/models/${change.entitySlug}`
        : "/changes";

  return (
    <Link href={href} className={`card card-hover block p-4 ${major ? "border-l-[3px] border-l-orange-500" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="tag bg-gray-100 text-gray-600 border-gray-200">{CHANGE_TYPES[change.changeType] || change.changeType}</span>
          {!major && (
            <span className="tag bg-gray-50 text-gray-500 border-gray-200 hidden sm:inline-flex">{imp.label}</span>
          )}
          {major && <span className={`tag font-medium ${imp.cls}`}>{imp.label}</span>}
        </div>
        <time className="text-xs text-gray-400 shrink-0" dateTime={new Date(change.detectedAt).toISOString()}>
          {timeAgo(change.detectedAt, nowMs)}
        </time>
      </div>
      <h3 className={`mt-2 font-semibold ${major ? "text-[15px]" : "text-sm"} text-gray-900`}>{change.title}</h3>
      <p className="mt-1 text-sm text-gray-600 leading-relaxed line-clamp-2">{change.summary}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          {change.impactText && (
            <span className={`num font-medium ${change.impactText.includes("↓") ? "text-red-600" : "text-emerald-600"}`}>
              {change.impactText.includes("推荐指数") ? "" : ""}
              {change.impactText}
            </span>
          )}
          {major && !change.impactText && <span />}
        </div>
        <span className="text-[11px] text-gray-400">来源：{SOURCE_TYPE[change.sourceType] || change.sourceType}</span>
      </div>
    </Link>
  );
}
