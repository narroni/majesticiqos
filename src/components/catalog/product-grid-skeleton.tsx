import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COUNT = 8;

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-4/5 w-full rounded-md" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
