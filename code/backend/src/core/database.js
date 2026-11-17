// Mongoose 连接管理
import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  console.log(`[db] MongoDB connected: ${config.mongoUri}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log("[db] MongoDB disconnected");
}
