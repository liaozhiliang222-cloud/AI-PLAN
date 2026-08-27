import Link from "next/link";
import type { PlanT } from "@/lib/serialize";
import { fmtPrice } from "@/lib/format";
import { valuePct } from "@/lib/config";
import { LogoBadge } from "./LogoBadge";
import { ScoreBadge, TrendBadge } from "./ScoreBadge";
import { RowActions } from "./RowActions";

/** 排行榜行（桌面表格形态）；移动端请配合 PlanCardMini */
export function PlanRow({ rank, plan }: { rank: number; plan: PlanT }) {
  const s = plan.score;
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
      <div className="hidden lg:flex items-center gap-4">
        <ScoreBadge value={s?.quota} label="额度" size="sm" muted />
        <ScoreBadge value={s?.ability} label="Coding" size="sm" muted />
        <ScoreBadge value={valuePct(plan.priceCny)} label="性价比" size="sm" muted />
      </div>
      <div className="flex flex-col items-center gap-1 w-12 shrink-0">
        <ScoreBadge value={s?.overall} />
        <TrendBadge trend={s?.trend} />
      </div>
      <div className="hidden xl:block text-xs text-gray-500 max-w-36 truncate">
        {plan.scenarios.slice(0, 3).join(" / ")}
      </div>
      <RowActions kind="plan" slug={plan.slug} />
    </div>
  );
}

/** 移动端卡片 */
export function PlanCardMini({ rank, plan }: { rank: number; plan: PlanT }) {
  const s = plan.score;
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
          <TrendBadge trend={s?.trend} className="justify-end" />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
        {[
          ["综合", s?.overall],
          ["Coding", s?.ability],
          ["额度", s?.quota],
          ["性价比", valuePct(plan.priceCny)],
        ].map(([label, v]) => (
          <div key={String(label)} className="bg-gray-50 rounded-lg py-1.5">
            <div className="num text-sm font-semibold text-gray-800">{v == null ? "–" : Math.round(Number(v))}</div>
            <div className="text-[10px] text-gray-400">{String(label)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

