import "dotenv/config";
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();
app.listen(config.port, () =>
    console.log(`Contextly backend running on port ${config.port}`),
);
