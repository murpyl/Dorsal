import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { RadarDashboard } from "@/components/RadarDashboard";

export default function InstructorPage() {
  return (
    <Suspense fallback={<PageSkeleton wide />}>
      <RadarDashboard />
    </Suspense>
  );
}
