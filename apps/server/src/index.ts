import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initRealtime } from "./realtime/socket.js";
import { startScheduler } from "./jobs/scheduler.js";

const app = createApp();
const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Kehai Engine API listening on :${env.PORT} (${env.NODE_ENV})`);
});

startScheduler();

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));

// Every Express route already goes through asyncHandler, which catches
// rejections and hands them to the error middleware — but a single
// unguarded rejection anywhere (a background task, a library's own retry
// logic, a future addition that misses asyncHandler) would otherwise crash
// the entire Node process by default, dropping every connected user's
// session at once regardless of which account triggered it. Logging
// instead of crashing keeps one bad request from taking the whole service
// down for everyone else.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
