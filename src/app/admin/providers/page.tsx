import { db } from "@/lib/db";
import { saveProvider } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const providers = await db.provider.findMany({ include: { _count: { select: { plans: true, models: true } } }, orderBy: { id: "asc" } });
  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">新建 Provider</h2>
        <form action={saveProvider} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <F label="名称"><input name="name" required className="inp" /></F>
          <F label="Slug"><input name="slug" required pattern="[a-z0-9-]+" className="inp num" /></F>
          <F label="区域"><select name="country" className="inp"><option value="domestic">国内</option><option value="overseas">海外</option></select></F>
          <F label="Logo 颜色"><input name="logoColor" defaultValue="#2563EB" className="inp num" /></F>
          <F label="官网"><input name="website" className="inp" placeholder="https://" /></F>
          <F label="官方来源页"><input name="officialSource" className="inp" placeholder="定价/公告 URL" /></F>
          <div className="sm:col-span-3"><button className="btn btn-primary px-5 py-2">保存</button></div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-400 border-b border-gray-200">
            <th className="py-2.5 px-3 font-normal">ID</th><th className="font-normal">名称</th><th className="font-normal">Slug</th>
            <th className="font-normal">区域</th><th className="font-normal text-center">Plans</th><th className="font-normal text-center">Models</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {providers.map((p) => (
              <tr key={p.id}>
                <td className="py-2 px-3 num text-gray-400">{p.id}</td>
                <td className="font-medium text-gray-900">{p.name}</td>
                <td className="num text-xs text-gray-500">{p.slug}</td>
                <td className="text-xs">{p.country === "domestic" ? "国内" : "海外"}</td>
                <td className="num text-center">{p._count.plans}</td>
                <td className="num text-center">{p._count.models}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;background:#fff}.inp:focus{border-color:#2563eb}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="block text-[11px] text-gray-400 mb-1">{label}</span>{children}</label>);
}
