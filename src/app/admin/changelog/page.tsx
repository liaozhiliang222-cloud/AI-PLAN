import { db } from "@/lib/db";
import { saveChange, deleteChange } from "../actions";
import { fmtTime } from "@/lib/format";
import { CHANGE_TYPES } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminChangelogPage() {
  const [changes, plans, models] = await Promise.all([
    db.changeLog.findMany({ orderBy: { detectedAt: "desc" }, take: 50 }),
    db.plan.findMany({ select: { slug: true, name: true }, orderBy: { slug: "asc" } }),
    db.model.findMany({ select: { slug: true, name: true }, orderBy: { slug: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">新增变化</h2>
        <form action={saveChange} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <F label="关联 Plan slug"><select name="planSlug" className="inp"><option value="">（无）</option>{plans.map((p) => (<option key={p.slug} value={p.slug}>{p.name}</option>))}</select></F>
          <F label="或 Model slug"><select name="modelSlug" className="inp"><option value="">（无）</option>{models.map((m) => (<option key={m.slug} value={m.slug}>{m.name}</option>))}</select></F>
          <F label="变化类型"><select name="changeType" className="inp">{Object.entries(CHANGE_TYPES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></F>
          <F label="标题" span={2}><input name="title" required className="inp" placeholder="如：GLM Pro 降价至 ¥59" /></F>
          <F label="重要度"><select name="importance" className="inp"><option value="minor">轻微</option><option value="normal">一般</option><option value="major">重大</option></select></F>
          <F label="摘要" span={2}><input name="summary" required className="inp" /></F>
          <F label="来源类型"><select name="sourceType" className="inp">{["official", "benchmark", "community", "editorial"].map((t) => (<option key={t} value={t}>{t}</option>))}</select></F>
          <F label="来源标题"><input name="sourceTitle" required className="inp" placeholder="如：厂商定价页" /></F>
          <F label="来源 URL" span={2}><input name="sourceUrl" type="url" required className="inp" placeholder="https://..." /></F>
          <F label="核验时间"><input name="checkedAt" type="datetime-local" required className="inp" /></F>
          <p className="sm:col-span-3 text-[11px] text-orange-700 bg-orange-50 rounded-lg px-3 py-2">来源标题、有效 http(s) URL 和核验时间缺一不可；服务端只会将三项完整的日志标记为 verified。</p>
          <F label="旧值"><input name="impactFrom" type="number" step="0.1" className="inp num" /></F>
          <F label="新值"><input name="impactTo" type="number" step="0.1" className="inp num" /></F>
          <div className="sm:col-span-3"><button type="submit" className="btn btn-primary px-5 py-2">发布</button></div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-400 border-b border-gray-200">
            <th className="py-2.5 px-3 font-normal">时间</th><th className="font-normal">标题</th><th className="font-normal">实体</th>
            <th className="font-normal">类型</th><th className="font-normal">来源</th><th className="font-normal">重要度</th><th className="px-3 font-normal text-right">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {changes.map((c) => (
              <tr key={c.id}>
                <td className="py-2 px-3 num text-xs text-gray-400 whitespace-nowrap">{fmtTime(c.detectedAt)}</td>
                <td className="text-gray-900">{c.title}</td>
                <td className="text-xs text-gray-500">{c.entitySlug || "-"}</td>
                <td className="text-xs">{CHANGE_TYPES[c.changeType]}</td>
                <td className="text-xs text-gray-500">{c.sourceUrl ? <a className="text-blue-600" href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceTitle || "打开"}</a> : "未填"}</td>
                <td className="text-xs">{{ major: "重大", normal: "一般", minor: "轻微" }[c.importance] || c.importance}</td>
                <td className="px-3 text-right"><form action={deleteChange}><input type="hidden" name="id" value={c.id} /><button className="text-red-500 hover:text-red-700 text-xs">删除</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;background:#fff}.inp:focus{border-color:#2563eb}`}</style>
    </div>
  );
}

function F({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (<label className={`block ${span ? `sm:col-span-${span}` : ""}`}><span className="block text-[11px] text-gray-400 mb-1">{label}</span>{children}</label>);
}
