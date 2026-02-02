import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync Linear issues every 15 minutes (AGT-161: optimized GraphQL = ~1 API call per sync)
// Real-time updates come via /api/webhooks/linear webhook
crons.interval(
  "sync-linear",
  { minutes: 15 },
  internal.linearSync.syncAll,
  {}
);

// AGT-119: Agent heartbeats — staggered 15-min intervals
// MAX at :00, SAM at :05, LEO at :10 of each 15-min window
crons.cron(
  "heartbeat-max",
  "0,15,30,45 * * * *", // Every 15 mins at :00, :15, :30, :45
  internal.heartbeat.heartbeatMax,
  {}
);

crons.cron(
  "heartbeat-sam",
  "5,20,35,50 * * * *", // Every 15 mins at :05, :20, :35, :50
  internal.heartbeat.heartbeatSam,
  {}
);

crons.cron(
  "heartbeat-leo",
  "10,25,40,55 * * * *", // Every 15 mins at :10, :25, :40, :55
  internal.heartbeat.heartbeatLeo,
  {}
);

export default crons;
