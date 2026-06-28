import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="flex-1 w-full bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Breadcrumb Skeleton */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Gallery Skeletons */}
          <div className="flex flex-col gap-4">
            <Skeleton className="relative aspect-square w-full" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="aspect-square" />
              <Skeleton className="aspect-square" />
              <Skeleton className="aspect-square" />
              <Skeleton className="aspect-square" />
            </div>
          </div>

          {/* Product Info Skeletons */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>

            <Skeleton className="h-12 w-3/4 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-10 w-40 mb-6" />

            <div className="space-y-3 mb-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            <Skeleton className="h-[1px] w-full my-2" />

            <div className="flex flex-col sm:flex-row gap-4 my-4">
              <Skeleton className="h-14 w-full sm:w-32" />
              <Skeleton className="h-14 w-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
