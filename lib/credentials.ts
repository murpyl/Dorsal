import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export const studentTokenKey = (code: string) => `dorsal:student:${code}`;
export const instructorSecretKey = (sessionId: string) => `dorsal:instructor:${sessionId}`;
export const taSecretKey = (sessionId: string) => `dorsal:ta:${sessionId}`;

export function newSecret() {
  return crypto.randomUUID() + crypto.randomUUID();
}

/** Reads (optionally creating) a credential in localStorage. `undefined` until hydrated on the client. */
export function useStoredCredential(key: string, createIfMissing: boolean): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => {
      let value = localStorage.getItem(key);
      if (!value && createIfMissing) {
        value = newSecret();
        localStorage.setItem(key, value);
      }
      return value;
    },
    () => undefined,
  );
}
