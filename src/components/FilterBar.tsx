import Link from "next/link";
import { PRICE_BANDS, REGIONS, SCENARIOS, TOOL_FILTERS, SORTS } from "@/lib/config";

function Href({ base, params, k, v, active, label }: { base: string; params: URLSearchParams; k: string; v: string; active: boolean; label: string }) {
  const p = new URLSearchParams(params.toString());
  if (active || p.get(k) === v) p.delete(k);
  else p.set(k, v);
  const qs = p.toString();
  return (
    <Link href={`${base}${qs ? `?${qs}` : ""}`} scroll={false} className={`chip ${active ? "chip-active" : "chip-idle"}`}>
      {label}
    </Link>
  );
}

/** URL 参数驱动的筛选条（无 JS 状态，天然可分享） */
export function FilterBar({
  base,
  searchParams,
}: {
  base: string;
  searchParams: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (v && v !== "all") params.set(k, v);

  return (
    <div className="space-y-2.5">
      <Group label="预算">
        {PRICE_BANDS.map((b) => (
          <Href key={b.key} base={base} params={params} k="budget" v={b.key} active={(searchParams.budget ?? "all") === b.key} label={b.label} />
        ))}
      </Group>
      <Group label="区域">
        {REGIONS.map((r) => (
          <Href key={r.key} base={base} params={params} k="region" v={r.key} active={(searchParams.region ?? "all") === r.key} label={r.label} />
        ))}
      </Group>
      <Group label="场景">
        {[{ key: "all", label: "全部" }, ...SCENARIOS].map((s) => (
          <Href key={s.key} base={base} params={params} k="scene" v={s.key} active={(searchParams.scene ?? "all") === s.key} label={s.label} />
        ))}
      </Group>
      <Group label="工具">
        {TOOL_FILTERS.map((t) => {
          const key = t === "全部" ? "all" : t;
          return <Href key={key} base={base} params={params} k="tool" v={key} active={(searchParams.tool ?? "all") === key} label={t} />;
        })}
      </Group>
      <Group label="排序">
        {SORTS.map((so) => (
          <Href key={so.key} base={base} params={params} k="sort" v={so.key} active={(searchParams.sort ?? "overall") === so.key} label={so.label} />
        ))}
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
      <span className="text-xs text-gray-400 w-9 pt-1 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-wrap min-[480px]:flex-nowrap">{children}</div>
    </div>
  );
}
