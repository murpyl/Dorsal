import { Suspense } from "react";
import { StudentCockpit } from "@/components/StudentCockpit";

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-500">Loading…</p>}>
      <StudentCockpit />
    </Suspense>
  );
}
