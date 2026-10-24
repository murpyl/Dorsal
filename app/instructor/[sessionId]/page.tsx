import { Suspense } from "react";
import { RadarDashboard } from "@/components/RadarDashboard";

export default function InstructorPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-500">Loading…</p>}>
      <RadarDashboard />
    </Suspense>
  );
}
