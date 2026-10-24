import { Suspense } from "react";
import { PeerRoom } from "@/components/PeerRoom";

export default function RoomPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-500">Loading…</p>}>
      <PeerRoom />
    </Suspense>
  );
}
