// IPC 随测试父进程断开时退出，避免外层超时强制终止测试后遗留后端
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export function startTestBackend(uri, port) {
  return spawn(process.execPath, ["--input-type=module", "-e",
    'process.on("disconnect", () => process.exit(0)); await import("./src/app.js");'], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, MONGODB_URI: uri, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
}
