import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { contextMiddleware } from "./shared/context";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFoundError } from "./shared/errors";
import authRoutes from "./modules/auth/auth.routes";
import documentsRoutes from "./modules/documents/documents.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());
  app.use(contextMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => res.json({ status: "ok" })); // before auth, always

  app.use("/auth", authRoutes);
  app.use("/documents", documentsRoutes);

  app.use((req, res, next) => next(new NotFoundError("Route")));
  app.use(errorHandler);

  return app;
}
