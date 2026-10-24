"use client";

import { useConvexConnectionState } from "convex/react";

/** Banner shown while the Convex WebSocket is down. Data on screen stays as last received. */
export function ConnectionStatus() {
  const state = useConvexConnectionState();
  if (state.isWebSocketConnected) return null;
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {state.hasEverConnected ? "Disconnected — reconnecting… Showing the last data received." : "Connecting to the live session…"}
      {state.connectionRetries > 0 && <span className="ml-1 text-amber-700">(retry {state.connectionRetries})</span>}
    </div>
  );
}
