import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

/** Full-screen centered loader used while the session is being resolved. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}


/** Placeholder module for pages that will be built out next. */
export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={description} />
      <EmptyState
        title="Under construction"
        description="This module is being built on top of the ERPNext API. Data flows through the standard Frappe REST endpoints and will appear here."
      />
    </div>
  );
}
