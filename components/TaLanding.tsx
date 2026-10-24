"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { InlineError } from "@/components/InlineError";
import { PageSkeleton } from "@/components/PageSkeleton";
import { taSecretKey } from "@/lib/credentials";

const subscribe = () => () => {};

/** `/ta/<sessionId>#<secret>`: stores this TA's personal secret on the device and opens the instructor dashboard. */
export function TaLanding() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const secret = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => undefined);

  useEffect(() => {
    if (!secret) return;
    localStorage.setItem(taSecretKey(sessionId), secret);
    router.replace(`/instructor/${sessionId}`);
  }, [secret, sessionId, router]);

  if (secret === "")
    return (
      <main className="mx-auto w-full max-w-xl p-10">
        <InlineError message="This TA link is incomplete. Ask the instructor to copy it again." />
      </main>
    );
  return <PageSkeleton wide />;
}
