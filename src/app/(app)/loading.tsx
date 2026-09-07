import { Skeleton } from "@/components/ui/states";
import { t } from "@/lib/i18n";

/** Shown while a protected page renders on the server. */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">
      <span className="sr-only" role="status">
        {t("common.loading")}
      </span>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-28 md:col-span-2" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-4 h-64" />
    </div>
  );
}
