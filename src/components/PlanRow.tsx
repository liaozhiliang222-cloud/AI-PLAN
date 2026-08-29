import Link from "next/link";
import type { PlanT } from "@/lib/serialize";
import { fmtPrice, quotaLabel } from "@/lib/format";
import { LogoBadge } from "./LogoBadge";
import { RowActions } from "./RowActions";

/** 套餐参数目录行；序号仅表示当前事实排序下的位置。 */
export function PlanRow({ rank, plan }: { rank: number; plan: PlanT }) {
  const quota = quotaLabel(plan);
  return (
    <div className="card card-hover mb-2 p-3 md:p-4 flex items-center gap-3 md:gap-5">
      <span className="num w-7 shrink-0 text-sm font-semibold text-gray-400">#{rank}</span>
      <Link href={`/plans/${plan.slug}`} className="flex items-center gap-3 min-w-0 flex-1">
        <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} />
        <span className="min-w-0">
          <span className="block text-xs text-gray-400 truncate">{plan.provider.name}</span>
          <span className="block font-medium text-gray-900 truncate hover:text-blue-700">{plan.name}</span>
        </span>
      </Link>
      <div className="hidden sm:block w-20 num text-right text-sm text-gray-900">{fmtPrice(plan.priceCny)}<span className="text-[10px] text-gray-400">/月</span></div>
      <div className="hidden lg:block w-52 text-xs text-gray-500 truncate" title={quota}>{quota}</div>
      <div className="hidden xl:block text-xs text-gray-500 max-w-36 truncate">{plan.priceNote || "请以官方页面为准"}</div>
      {plan.officialUrl ? <a href={plan.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 shrink-0">套餐来源</a> : <span className="text-xs text-orange-600 shrink-0">待来源复核</span>}
      <RowActions kind="plan" slug={plan.slug} />
    </div>
  );
}

/** 移动端卡片 */
export function PlanCardMini({ rank, plan }: { rank: number; plan: PlanT }) {
  const quota = quotaLabel(plan);
  return (
    <div className="card card-hover p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="num text-xs text-gray-400 w-6">#{rank}</span>
        <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} size={28} />
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] text-gray-400 truncate">{plan.provider.name}</span>
          <Link href={`/plans/${plan.slug}`} className="block text-sm font-medium text-gray-900 truncate">
            {plan.name}
          </Link>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold num text-gray-900">{fmtPrice(plan.priceCny)}</div>
          <div className="text-[10px] text-gray-400">{plan.priceNote || "/月"}</div>
        </div>
      </div>
      <p className="mt-2.5 text-xs text-gray-500 line-clamp-2">{quota}</p>
      <div className="mt-2 text-right">{plan.officialUrl ? <a href={plan.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">套餐来源</a> : <span className="text-xs text-orange-600">待来源复核</span>}</div>
    </div>
  );
}
