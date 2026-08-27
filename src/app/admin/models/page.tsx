import Link from "next/link";
import { db } from "@/lib/db";
import { saveModel, deleteModel } from "../actions";
import { jarr } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminModelsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const [providers, models] = await Promise.all([
    db.provider.findMany({ orderBy: { name: "asc" } }),
    db.model.findMany({ include: { provider: true, score: true }, orderBy: { id: "asc" } }),
  ]);
  const editing = sp.edit ? models.find((m) => m.id === Number(sp.edit)) : undefined;

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">{editing ? `编辑：${editing.name}` : "新建 Model（含评分）"}</h2>
        <form action={saveModel} key={editing?.id ?? "new"} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Provider"><select name="providerId" defaultValue={editing?.providerId} className="inp">{providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></Field>
          <Field label="名称"><input name="name" defaultValue={editing?.name} required className="inp" /></Field>
          <Field label="Slug"><input name="slug" defaultValue={editing?.slug} required pattern="[a-z0-9-]+" className="inp num" /></Field>
          <Field label="上下文 (K tokens)"><input type="number" name="contextK" defaultValue={editing?.contextK ?? ""} className="inp num" /></Field>
          <Field label="输入价 ¥/M"><input type="number" step="0.1" name="inputPrice" defaultValue={editing?.inputPrice ?? ""} className="inp num" /></Field>
          <Field label="输出价 ¥/M"><input type="number" step="0.1" name="outputPrice" defaultValue={editing?.outputPrice ?? ""} className="inp num" /></Field>
          <Field label="发布日期"><input name="releaseDate" defaultValue={editing?.releaseDate ?? ""} placeholder="2026-08-01" className="inp num" /></Field>
          <Field label="优势（分号/换行分隔）"><textarea name="strengths" rows={2} defaultValue={jarr(editing?.strengths).join("；")} className="inp" /></Field>
          <Field label="弱项（分号/换行分隔）"><textarea name="weaknesses" rows={2} defaultValue={jarr(editing?.weaknesses).join("；")} className="inp" /></Field>
          <Field label="推荐场景 keys"><input name="recommendedScenarios" defaultValue={jarr(editing?.recommendedScenarios).join(",")} placeholder="agent,bigrepo" className="inp" /></Field>
          <div className="sm:col-span-3 border-t border-gray-100 pt-3 mt-1">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Model Scores（overall 自动加权计算）</h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[["coding", "Coding"], ["agent", "Agent"], ["frontend", "Frontend"], ["backend", "Backend"], ["debug", "Debug"], ["longContext", "长上下文"], ["speed", "Speed"], ["cost", "Cost"]].map(([k, l]) => (
                <Field key={k} label={l}><input type="number" min="0" max="100" name={k} defaultValue={((editing?.score ?? {}) as Record<string, number | null>)[k] ?? 75} className="inp num px-2 py-1.5" /></Field>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn btn-primary px-5 py-2">保存</button>
            {editing && <Link href="/admin/models" className="btn btn-secondary px-4 py-2">取消</Link>}
          </div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-400 border-b border-gray-200">
            <th className="py-2.5 px-3 font-normal">ID</th><th className="font-normal">Model</th><th className="font-normal">Provider</th>
            <th className="font-normal text-center">Overall</th><th className="font-normal text-center">Coding</th><th className="font-normal text-center">Agent</th>
            <th className="px-3 font-normal text-right">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {models.map((m) => (
              <tr key={m.id}>
                <td className="py-2 px-3 num text-gray-400">{m.id}</td>
                <td className="font-medium text-gray-900">{m.name}</td>
                <td className="text-gray-500">{m.provider.name}</td>
                <td className="num text-center font-semibold text-blue-700">{m.score?.overall ?? "–"}</td>
                <td className="num text-center text-gray-600">{m.score?.coding ?? "–"}</td>
                <td className="num text-center text-gray-600">{m.score?.agent ?? "–"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/admin/models?edit=${m.id}`} className="text-blue-600 hover:text-blue-800 text-xs mr-3">编辑</Link>
                  <form action={deleteModel} className="inline"><input type="hidden" name="id" value={m.id} /><button className="text-red-500 hover:text-red-700 text-xs">删除</button></form>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
