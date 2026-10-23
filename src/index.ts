import { serve } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { app } from "./routes.js";
import { closePool } from "./db/pool.js";
import { openSshTunnel, closeSshTunnel } from "./lib/ssh-tunnel.js";

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  logger.error({ err }, "Unhandled error");
  return c.json({ error: "Internal server error", details: err.message }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

async function start() {
  if (config.MODEL_PROVIDER === "dev") {
    await openSshTunnel();
  }
  serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    logger.info({ port: info.port }, "Server started");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  await closeSshTunnel();
  await closePool();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
