// 驿迹 ExpressTrace 后端入口
import express from "express";
import { config } from "./core/config.js";
import { connectDB, disconnectDB } from "./core/database.js";
import { ok } from "./core/response.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import ordersRouter from "./routes/orders.js";
import statsRouter from "./routes/stats.js";
import trackRouter from "./routes/track.js";
import bagsRouter from "./routes/bags.js";

const app = express();
app.use(express.json());

// 健康检查（演示统一响应封装）
app.get("/api/v1/health", (req, res) => ok(res, { status: "up" }));

app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/track", trackRouter);
app.use("/api/v1/bags", bagsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function main() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[app] ExpressTrace backend listening on :${config.port}`);
  });
}

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
