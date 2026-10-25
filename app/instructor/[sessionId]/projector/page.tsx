import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ProjectorMode } from "@/components/ProjectorMode";

export default function ProjectorPage() {
  return (
    <Suspense fallback={<PageSkeleton wide />}>
      <ProjectorMode />
    </Suspense>
  );
}
