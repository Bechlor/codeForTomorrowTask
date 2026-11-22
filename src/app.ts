import express from "express";
import cors from "cors";
import { env } from "./config";
import { errorHandler, notFound } from "./middleware/error-handler";
import { router } from "./routes";

export const app = express();
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(router);
app.use(notFound);
app.use(errorHandler);
