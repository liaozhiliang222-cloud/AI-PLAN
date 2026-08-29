import Link from "next/link";

export function DatabaseUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`card border-amber-200 bg-amber-50 text-center ${compact ? "p-4" : "p-8 md:p-12"}`} role="status">
      <h1 className={`${compact ? "text-sm" : "text-lg"} font-semibold text-gray-900`}>数据服务暂时不可用</h1>
      <p className="mt-2 text-sm text-gray-600">数据库正在短暂恢复中，请稍后刷新页面。</p>
      {!compact && <Link href="/" className="btn btn-secondary mt-5 px-4 py-2">返回首页</Link>}
    </div>
  );
}
