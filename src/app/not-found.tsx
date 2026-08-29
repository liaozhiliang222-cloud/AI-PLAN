import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="num text-5xl font-bold text-gray-200">404</p>
      <p className="mt-3 font-medium text-gray-700">页面不存在或内容已下架</p>
      <p className="mt-1 text-sm text-gray-400">可能套餐已更新，试试从参数目录进入。</p>
      <Link href="/plans" className="btn btn-primary px-5 py-2.5 mt-5 inline-flex">查看套餐参数目录</Link>
    </div>
  );
}
