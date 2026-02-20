import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="w-full space-y-6 p-8">
      {/* Header skeleton */}
      <div className="text-center space-y-4">
        <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
        <Skeleton className="w-64 h-8 mx-auto" />
        <Skeleton className="w-96 h-4 mx-auto" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-12" />
        </div>
      </div>

      {/* Navigation skeleton */}
      <div className="flex justify-between pt-6">
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-24 h-10" />
      </div>
    </div>
  );
}
