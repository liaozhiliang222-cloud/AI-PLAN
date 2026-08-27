import Link from "next/link";
import { logout } from "./login-actions";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/models", label: "Models & Scores" },
  { href: "/admin/changelog", label: "Change Log" },
  { href: "/admin/sources", label: "Sources" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-lg font-bold text-gray-900">AI Plan Radar Admin</h1>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/" className="text-blue-600 hover:text-blue-800">返回前台 →</Link>
          <form action={logout}><button className="text-gray-400 hover:text-red-500">退出登录</button></form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto no-scrollbar pb-3 border-b border-gray-200 mb-5">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="chip chip-idle whitespace-nowrap">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
