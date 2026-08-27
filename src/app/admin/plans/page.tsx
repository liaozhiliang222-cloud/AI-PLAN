import Link from "next/link";
import { db } from "@/lib/db";
import { savePlan, deletePlan } from "../actions";
import { jarr } from "@/lib/serialize";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const [providers, plans] = await Promise.all([
    db.provider.findMany({ orderBy: { name: "asc" } }),
    db.plan.findMany({ include: { provider: true, score: true }, orderBy: [{ providerId: "asc" }, { priceCny: "asc" }] }),
  ]);
  const editing = sp.edit ? plans.find((p) => p.id === Number(sp.edit)) : undefined;

  return (
    <div className="space-y-5">
      {/* 表单 */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">{editing ? `编辑：${editing.name}` : "新建 Plan"}</h2>
        <form action={savePlan} key={editing?.id ?? "new"} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Provider"><select name="providerId" defaultValue={editing?.providerId} className="inp">{providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></Field>
          <Field label="Plan Name"><input name="name" defaultValue={editing?.name} required className="inp" /></Field>
          <Field label="Slug"><input name="slug" defaultValue={editing?.slug} required pattern="[a-z0-9-]+" className="inp num" /></Field>
          <Field label="价格 ¥/月"><input type="number" step="0.01" name="priceCny" defaultValue={editing?.priceCny ?? 0} className="inp num" /></Field>
          <Field label="价格备注（如 $20/月）"><input name="priceNote" defaultValue={editing?.priceNote} className="inp" /></Field>
          <Field label="区域"><select name="region" defaultValue={editing?.region ?? "domestic"} className="inp"><option value="domestic">国内</option><option value="overseas">海外</option></select></Field>
          <Field label="Tagline"><input name="tagline" defaultValue={editing?.tagline} className="inp sm:col-span-2" /></Field>
          <Field label="状态"><select name="status" defaultValue={editing?.status ?? "published"} className="inp"><option value="published">published</option><option value="draft">draft</option></select></Field>

          <Field label="额度类型"><select name="quotaType" defaultValue={editing?.quotaType ?? "credits"} className="inp">{["token", "tokens", "credits", "points", "requests"].map((t) => (<option key={t} value={t}>{t}</option>))}</select></Field>
          <Field label="额度数量"><input type="number" name="quotaAmount" defaultValue={editing?.quotaAmount ?? ""} className="inp num" /></Field>
          <Field label="额度单位"><input name="quotaUnit" defaultValue={editing?.quotaUnit ?? ""} placeholder="Credits/月" className="inp" /></Field>
          <Field label="重置周期"><select name="quotaWindow" defaultValue={editing?.quotaWindow ?? "monthly"} className="inp">{["5h", "daily", "weekly", "monthly", "payg"].map((t) => (<option key={t} value={t}>{t}</option>))}</select></Field>
          <Field label="容量指数 0-100"><input type="number" min="0" max="100" name="capacityIndex" defaultValue={editing?.capacityIndex ?? 50} className="inp num" /></Field>
          <Field label="上下文说明"><input name="contextNote" defaultValue={editing?.contextNote ?? ""} className="inp" /></Field>

          <Field label="工具（逗号分隔）" span={2}><input name="tools" defaultValue={jarr(editing?.tools).join(",")} className="inp" /></Field>
          <Field label="场景 keys（逗号分隔）"><input name="scenarios" defaultValue={jarr(editing?.scenarios).join(",")} placeholder="fullstack,agent" className="inp" /></Field>
          <Field label="官方 URL"><input name="officialUrl" defaultValue={editing?.officialUrl ?? ""} className="inp" /></Field>
          <Field label="上次验证"><span className="text-xs text-gray-400 pt-2 block">{editing?.lastVerifiedAt ? fmtTime(editing.lastVerifiedAt) : "保存后自动更新为当前时间"}</span></Field>

          {/* Plan Scores */}
          <div className="sm:col-span-3 border-t border-gray-100 pt-3 mt-1">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Plan Scores（overall 自动按权重计算）</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {[["ability", "模型能力", 60], ["quota", "额度", 50], ["price", "价格", 70], ["toolCompatScore", "工具兼容", 60], ["stability", "稳定性", 80], ["cnExperience", "国内体验", 60]].map(([k, l, d]) => (
                <Field key={k as string} label={l as string}><input type="number" min="0" max="100" name={k as string} defaultValue={((editing?.score ?? {}) as Record<string, number | null>)[k === "toolCompatScore" ? "toolCompat" : k] ?? d} className="inp num" /></Field>
              ))}
            </div>
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn btn-primary px-5 py-2">保存</button>
            {editing && <Link href="/admin/plans" className="btn btn-secondary px-4 py-2">取消编辑</Link>}
          </div>
        </form>
      </section>

      {/* 列表 */}
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-400 border-b border-gray-200">
            <th className="py-2.5 px-3 font-normal">ID</th><th className="font-normal">Plan</th><th className="font-normal">Slug</th>
            <th className="font-normal text-right">¥/月</th><th className="font-normal text-center">Overall</th>
            <th className="font-normal">验证时间</th><th className="px-3 font-normal text-right">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60">
                <td className="py-2 px-3 num text-gray-400">{p.id}</td>
                <td className="font-medium text-gray-900">{p.provider.name} {p.name}</td>
                <td className="num text-gray-500 text-xs">{p.slug}</td>
                <td className="num text-right text-gray-800">{p.priceCny}</td>
                <td className="num text-center font-semibold text-blue-700">{p.score?.overall ?? "–"}</td>
                <td className="text-xs text-gray-400">{p.lastVerifiedAt ? fmtTime(p.lastVerifiedAt) : "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/admin/plans?edit=${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs mr-3">编辑</Link>
                  <form action={deletePlan} className="inline"><input type="hidden" name="id" value={p.id} /><button className="text-red-500 hover:text-red-700 text-xs">删除</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;background:#fff}.inp:focus{border-color:#2563eb}`}</style>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <label className={`block ${span ? `sm:col-span-${span}` : ""}`}>
      <span className="block text-[11px] text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
