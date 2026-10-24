import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { StudentCockpit } from "@/components/StudentCockpit";

export default function JoinPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentCockpit />
    </Suspense>
  );
}
