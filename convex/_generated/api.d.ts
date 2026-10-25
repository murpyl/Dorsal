/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as claude from "../claude.js";
import type * as clusters from "../clusters.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as lessons from "../lessons.js";
import type * as messages from "../messages.js";
import type * as participants from "../participants.js";
import type * as prompts from "../prompts.js";
import type * as questions from "../questions.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as seedVideo from "../seedVideo.js";
import type * as sessions from "../sessions.js";
import type * as signals from "../signals.js";
import type * as tas from "../tas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  claude: typeof claude;
  clusters: typeof clusters;
  credentials: typeof credentials;
  crons: typeof crons;
  lessons: typeof lessons;
  messages: typeof messages;
  participants: typeof participants;
  prompts: typeof prompts;
  questions: typeof questions;
  rooms: typeof rooms;
  seed: typeof seed;
  seedVideo: typeof seedVideo;
  sessions: typeof sessions;
  signals: typeof signals;
  tas: typeof tas;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
