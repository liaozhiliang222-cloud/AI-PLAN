import Link from "next/link";
import { db } from "@/lib/db";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [providers, plans, models, pending, last24h] = await Promise.all([
    db.provider.count(),
    db.plan.count(),
    db.model.count(),
    db.reviewItem.count({ where: { status: "pending" } }),
    db.changeLog.count({ where: { detectedAt: { gte: new Date(Date.now() - 864e5) } } }),
  ]);

  const stats = [
    ["Providers", providers, "/admin/providers"],
    ["Plans", plans, "/admin/plans"],
    ["Models", models, "/admin/models"],
    ["待审核变化", pending, "/admin/sources"],
    ["过去 24h 变化", last24h, "/admin/changelog"],
  ] as const;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {stats.map(([label, v, href]) => (
          <Link key={label} href={href} className="card card-hover p-4">
            <div className="num text-2xl font-bold text-gray-900">{v}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <section className="card p-4 mt-4">
        <h2 className="text-sm font-semibold text-gray-900">快捷入口</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-600 list-disc pl-5">
          <li><Link className="text-blue-600 hover:underline" href="/admin/plans">Plans 管理</Link>：编辑价格、额度与评分（overall 自动按权重计算）</li>
          <li><Link className="text-blue-600 hover:underline" href="/admin/changelog">Change Log</Link>：新增行情变化并同步到前台</li>
          <li><Link className="text-blue-600 hover:underline" href="/admin/sources">Sources</Link>：Source Monitor 概念验证与审核队列</li>
        </ul>
      </section>

      <p className="mt-4 text-[11px] text-gray-400">当前时间：{fmtTime(new Date())} · 已启用口令登录鉴权（中间件），生产部署前请设置强口令。</p>
    </div>
  );
}
