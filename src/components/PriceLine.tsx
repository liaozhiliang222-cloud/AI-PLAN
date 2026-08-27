import { fmtPrice } from "@/lib/format";

/** 简单价格折线图（零依赖 SVG，服务端渲染） */
export function PriceLine({ points, range = "90d" }: { points: { date: Date | string; priceCny: number }[]; range?: string }) {
  const days = range === "30d" ? 31 : range === "90d" ? 92 : 3650;
  const cutoff = Date.now() - days * 864e5;
  const pts = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  if (pts.length < 2) {
    return <div className="text-xs text-gray-400 py-8 text-center">暂无足够历史数据</div>;
  }
  const prices = pts.map((p) => p.priceCny);
  const min = Math.min(...prices) * 0.97 || 0;
  const max = Math.max(...prices) * 1.03 || 1;
  const W = 640;
  const H = 160;
  const PAD = 24;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (pts.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.priceCny).toFixed(1)}`).join(" ");
  const last = prices[prices.length - 1];
  const first = prices[0];
  const up = last >= first;
  const color = up ? "#059669" : "#dc2626";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="价格趋势">
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeWidth="1" />
            <text x={PAD - 4} y={y(v) + 3} fontSize="9" fill="#9CA3AF" textAnchor="end">
              {fmtPrice(v)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(pts.length - 1)} cy={y(last)} r="3.5" fill={color} />
      </svg>
      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
        <span>{new Date(pts[0].date).toLocaleDateString("zh-CN")}</span>
        <span>当前 {fmtPrice(last)}</span>
        <span>{new Date(pts[pts.length - 1].date).toLocaleDateString("zh-CN")}</span>
      </div>
    </div>
  );
}
