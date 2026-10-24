import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("purge stale lesson uploads", { minutes: 15 }, internal.lessons.purgeStaleUploads, {});

export default crons;
