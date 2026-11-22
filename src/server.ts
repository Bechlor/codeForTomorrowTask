import { app } from "./app";
import { env } from "./config";
import { db } from "./db";

const server = app.listen(env.PORT, () => {
  console.log(`Chat API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
