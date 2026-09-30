import { config } from './config.js';
import { db } from './db/database.js';
import { createApp } from './app.js';
import { streamManager } from './modules/cameras/streamManager.js';

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled promise rejection', reason);
});

const server = createApp().listen(config.port, () => {
  console.log(`AURA-Snap API listening on http://localhost:${config.port} (time zone ${config.timezone})`);
  streamManager.startAll();
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  streamManager.stopAll();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
