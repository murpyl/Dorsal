"use client";

import { useConvexConnectionState } from "convex/react";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Banner shown while the Convex WebSocket is down. Data on screen stays as last received. */
export function ConnectionStatus() {
  const state = useConvexConnectionState();
  if (state.isWebSocketConnected) return null;
  return (
    <Alert role="status" aria-live="polite" className="enter border-amber-400/40 bg-amber-400/10 text-amber-200">
      <WifiOff />
      <AlertTitle>{state.hasEverConnected ? "Disconnected — reconnecting…" : "Connecting to the live session…"}</AlertTitle>
      <AlertDescription className="text-amber-200/80">
        {state.hasEverConnected ? "Showing the last data received." : "This usually takes a moment."}
        {state.connectionRetries > 0 && ` (retry ${state.connectionRetries})`}
      </AlertDescription>
    </Alert>
  );
}
