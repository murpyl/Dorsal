import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { PeerRoom } from "@/components/PeerRoom";

export default function RoomPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PeerRoom />
    </Suspense>
  );
}
