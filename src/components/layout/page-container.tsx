import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 pb-20 md:px-8 md:py-8">{children}</div>
  );
}
