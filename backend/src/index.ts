import "dotenv/config";
import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./infrastructure/database/pool";

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connection verified");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }

  const app = createApp();
  app.listen(config.port, () => console.log(`Contextly backend running on port ${config.port}`));
}

start();
