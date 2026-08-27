export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

/** 列表页通用骨架 */
export default function LoadingList() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="pt-3 flex gap-2 flex-wrap">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-14 ml-auto" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
