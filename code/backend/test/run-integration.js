// 只使用已有镜像，创建独立临时实例；仅清理本次成功创建的容器 ID
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

function docker(...args) {
  return execFileSync("docker", args, { encoding: "utf8", timeout: 30000 }).trim();
}

let containerId;
try {
  const name = `express-trace-issue7-${randomBytes(6).toString("hex")}`;
  containerId = docker("run", "-d", "--rm", "--pull=never", "--name", name,
    "--label", "express-trace.integration=issue7", "-p", "127.0.0.1::27017",
    "--tmpfs", "/data/db:rw,size=512m", "--tmpfs", "/data/configdb:rw,size=64m",
    "mongo:7", "--wiredTigerCacheSizeGB", "0.25", "--bind_ip_all");
  assert.match(containerId, /^[a-f0-9]{64}$/);
  const info = JSON.parse(docker("inspect", containerId))[0];
  const port = info.NetworkSettings.Ports["27017/tcp"][0].HostPort;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const ping = spawnSync("docker", ["exec", containerId, "mongosh", "--quiet", "--eval",
      "quit(db.adminCommand({ping:1}).ok === 1 ? 0 : 1)"], { timeout: 5000, stdio: "ignore" });
    if (ping.status === 0) {
      ready = true;
      break;
    }
    await delay(500);
  }
  assert.ok(ready, "临时 MongoDB 启动超时");
  console.log(`[integration] 临时实例：${name}，本机端口：${port}`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("stats-track.integration.test.js", import.meta.url))], {
    env: {
      ...process.env,
      INTEGRATION_MONGODB_URI: `mongodb://127.0.0.1:${port}/express_trace`,
      INTEGRATION_CONTAINER_ID: containerId
    },
    stdio: "inherit",
    timeout: 90000
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error("[integration]", error.message);
  process.exitCode = 1;
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId)) {
    try {
      docker("stop", containerId);
      console.log("[integration] 本次临时容器及其内存数据已移除");
    } catch (error) {
      console.error("[integration] 清理失败，请核对本次容器 ID：", containerId, error.message);
      process.exitCode = 1;
    }
  }
}
