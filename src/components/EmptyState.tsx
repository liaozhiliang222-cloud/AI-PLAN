import Link from "next/link";

export function EmptyState({ title, desc, cta }: { title: string; desc?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card text-center py-14 px-6 mt-6">
      <p className="font-medium text-gray-700">{title}</p>
      {desc && <p className="mt-1.5 text-sm text-gray-400">{desc}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary px-4 py-2 mt-4 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
