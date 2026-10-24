import { ConvexError } from "convex/values";

export function errorMessage(err: unknown) {
  return err instanceof ConvexError ? String(err.data) : "Something went wrong. Try again.";
}
