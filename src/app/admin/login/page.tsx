import { login } from "../login-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin 登录", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const sp = await searchParams;

  const errText =
    sp.error === "locked"
      ? "尝试次数过多，请 10 分钟后再试。"
      : sp.error === "csrf"
        ? "请求校验失败，请刷新页面后重试。"
        : sp.error
          ? "口令错误，请重试。"
          : null;

  return (
    <div className="max-w-xs mx-auto pt-16">
      <h1 className="text-lg font-bold text-gray-900 text-center">Admin 后台登录</h1>
      <form action={login} className="card p-4 mt-4 space-y-3">
        <input type="hidden" name="from" value={sp.from || "/admin"} />
        <label className="block">
          <span className="block text-[11px] text-gray-400 mb-1">管理口令</span>
          <input name="password" type="password" required autoFocus className="inp" />
        </label>
        {errText && <p className="text-xs text-red-500">{errText}</p>}
        <button type="submit" className="btn btn-primary w-full py-2">进入后台</button>
        <p className="text-[11px] text-gray-400 text-center">请在 .env 中设置 ADMIN_PASSWORD（勿用默认口令）</p>
      </form>
      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:14px;outline:none}.inp:focus{border-color:#2563eb}`}</style>
    </div>
  );
}
