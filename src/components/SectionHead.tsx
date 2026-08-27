import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHead({ title, sub, more }: { title: string; sub?: string; more?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between mb-3.5">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {more && (
        <Link href={more.href} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap flex items-center gap-0.5">
          {more.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
