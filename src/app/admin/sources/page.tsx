import { db } from "@/lib/db";
import {
  addSource, checkSource, dismissReview, checkAllSourcesAction, runSamplingAction,
  generateDraftAction, applyReviewAction,
} from "../actions";
import { fmtTime } from "@/lib/format";
import { readDraft } from "@/services/extract";
import { CHANGE_TYPES } from "@/lib/config";
import { safeParseJson } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const [sources, reviews, plans] = await Promise.all([
    db.sourceMonitor.findMany({ orderBy: { id: "asc" } }),
    db.reviewItem.findMany({ include: { source: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.plan.findMany({ select: { id: true, slug: true, name: true, provider: { select: { name: true, slug: true } } }, orderBy: [{ providerId: "asc" }, { priceCny: "asc" }] }),
  ]);
  const planIdBySlug = new Map(plans.map((p) => [p.slug, p.id]));

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500 leading-relaxed card p-3 bg-blue-50/40 border-blue-200">
        流水线：<b>定时检查 Hash → 变化入审核队列 → 规则解析草稿（预留 LLM 接口）→ 管理员核对 → 更新正式数据 + Change Log</b>。
        解析器当前为规则启发式（货币数值 / 『从X到Y』模式），确认前务必人工核对。
      </p>

      {sp.err === "no-draft" && (
        <p className="card p-3 text-sm text-orange-600 border-orange-200">未能从页面内容解析出价格草稿（可能抓取失败或未含价格数字）。</p>
      )}
      {sp.err === "source-provider-mismatch" && <p className="card p-3 text-sm text-red-600 border-red-200">审核失败：监控源未绑定 Provider，或与套餐厂商不一致。记录仍保留在待审核队列。</p>}
      {sp.err === "invalid-price-value" && <p className="card p-3 text-sm text-red-600 border-red-200">审核失败：价格新值必须是大于 0 的有限数字。记录仍保留在待审核队列。</p>}
      {sp.err === "incomplete-plan-source" && <p className="card p-3 text-sm text-red-600 border-red-200">审核失败：监控源不是可核验的套餐级来源。记录仍保留在待审核队列。</p>}
      {sp.ok && <p className="card p-3 text-sm text-emerald-600 border-emerald-200">已确认入库：套餐价格与 Change Log 已更新。</p>}

      {/* 添加监控源 + 快捷操作 */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">添加监控源</h2>
        <form id="add-source-form" action={addSource} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <F label="标签"><input name="label" required className="inp" placeholder="官方定价页" /></F>
          <F label="URL"><input name="url" type="url" required className="inp num" placeholder="https://" /></F>
          <F label="Provider slug"><input name="providerSlug" className="inp num" placeholder="moonshot" /></F>
        </form>
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          <button type="submit" form="add-source-form" className="btn btn-primary px-4 py-1.5 text-sm">添加</button>
          <span className="flex-1" />
          <form action={checkAllSourcesAction}><button className="btn btn-secondary px-3 py-1.5 text-xs">全部检查</button></form>
          <form action={runSamplingAction}><button className="btn btn-primary px-3 py-1.5 text-xs">立即价格采样</button></form>
        </div>
      </section>

      {/* 监控源列表 */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">监控源</h2>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[680px]">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-400 border-b border-gray-200">
              <th className="py-2.5 px-3 font-normal">源</th><th className="font-normal">URL</th>
              <th className="font-normal">lastHash</th><th className="font-normal">lastCheckedAt</th><th className="px-3 font-normal text-right">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {sources.map((sc) => (
                <tr key={sc.id}>
                  <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">{sc.label}{!sc.enabled && <span className="tag ml-1 bg-gray-100 border-gray-200">停用</span>}</td>
                  <td className="text-xs text-gray-500 max-w-64 truncate num">{sc.url}</td>
                  <td className="num text-[11px] text-gray-400">{sc.lastHash ? sc.lastHash.slice(0, 10) + "…" : "—"}</td>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{sc.lastCheckedAt ? fmtTime(sc.lastCheckedAt) : "未检查"}</td>
                  <td className="px-3 text-right">
                    <form action={checkSource} className="inline">
                      <input type="hidden" name="id" value={sc.id} />
                      <button className="btn btn-secondary px-2.5 py-1 text-xs">检查更新</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!sources.length && <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">还没有监控源</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
          定时任务：GET /api/cron?token=&lt;sha256(apr-admin:口令)&gt;（可选 &amp;sources=1 同时检查监控源），供外部调度器每日调用。
        </p>
      </section>

      {/* 审核队列 */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">审核队列（Review Queue）</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">队列为空。页面内容发生变化后会出现在这里。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reviews.map((r) => {
              let draft = null;
              const matchingPlans = r.source?.providerSlug ? plans.filter((p) => p.provider.slug === r.source?.providerSlug) : [];
              try {
                draft = r.status === "pending" ? readDraft(r.payload) : null;
              } catch {}
              return (
                <li key={r.id} className="py-3 space-y-2.5">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className={`tag mt-0.5 ${r.status === "pending" ? "bg-orange-50 text-orange-700 border-orange-200" : r.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>{r.status}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 num truncate">{r.source?.label ?? "价格异常检测"} · {fmtTime(r.createdAt)} · {safeParseJson<{ note?: string }>(r.payload, {}).note || "内容变化"}</p>
                      {draft && (
                        <p className="text-xs text-gray-600 mt-1 num">
                          草稿：{draft.title}　{draft.oldValue} → {draft.newValue}
                          <span className={`ml-1 font-medium ${String(draft.confidence).startsWith("llm") ? "text-blue-600" : "text-gray-400"}`}>
                            （置信度 {draft.confidence}）
                          </span>
                        </p>
                      )}
                    </div>
                    {r.status === "pending" && !draft && (
                      <form action={generateDraftAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="btn btn-secondary px-2.5 py-1 text-xs">生成解析草稿</button>
                      </form>
                    )}
                    {r.status === "pending" && (
                      <form action={dismissReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-red-400 hover:text-red-600 text-xs pt-1.5">忽略</button>
                      </form>
                    )}
                  </div>

                  {/* 确认入库表单（有草稿时展示） */}
                  {r.status === "pending" && matchingPlans.length > 0 && (
                    <form action={applyReviewAction} className="border border-dashed border-gray-300 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end bg-gray-50/50">
                      <input type="hidden" name="id" value={r.id} />
                      <F label="关联 Plan">
                        <select name="planId" defaultValue={draft?.planSlug ? planIdBySlug.get(draft.planSlug) ?? "" : ""} required className="inp">
                          <option value="">选择…</option>
                          {matchingPlans.map((p) => (<option key={p.id} value={p.id}>{p.provider.name} {p.name}</option>))}
                        </select>
                      </F>
                      <F label="类型">
                        <select name="changeType" defaultValue={draft?.changeType ?? "price"} className="inp">
                          {Object.keys(CHANGE_TYPES).map((t) => (<option key={t} value={t}>{CHANGE_TYPES[t]}</option>))}
                        </select>
                      </F>
                      <F label="旧值"><input name="oldValue" type="number" step="0.01" defaultValue={draft?.oldValue ?? ""} className="inp num" /></F>
                      <F label="新值（价格类型必填）"><input name="newValue" type="number" min="0.01" step="0.01" required defaultValue={draft?.newValue ?? ""} className="inp num" /></F>
                      <F label="标题"><input name="title" defaultValue={draft?.title ?? ""} className="inp" /></F>
                      <div className="flex gap-1.5">
                        <button className="btn btn-primary px-3 py-1.5 text-xs whitespace-nowrap">确认入库</button>
                      </div>
                      <input type="hidden" name="summary" value={draft?.summary ?? "人工确认的价格变化"} />
                      <input type="hidden" name="importance" value="normal" />
                    </form>
                  )}
                  {r.status === "pending" && matchingPlans.length === 0 && (
                    <p className="border border-orange-200 bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
                      {r.source?.providerSlug ? `没有找到与监控源 Provider「${r.source.providerSlug}」匹配的套餐，不能确认入库。` : "该待审项没有绑定带 Provider slug 的监控源，不能确认入库。"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;background:#fff}.inp:focus{border-color:#2563eb}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="block text-[11px] text-gray-400 mb-1">{label}</span>{children}</label>);
}
