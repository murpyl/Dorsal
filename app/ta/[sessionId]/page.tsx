import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { TaLanding } from "@/components/TaLanding";

export default function TaPage() {
  return (
    <Suspense fallback={<PageSkeleton wide />}>
      <TaLanding />
    </Suspense>
  );
}
