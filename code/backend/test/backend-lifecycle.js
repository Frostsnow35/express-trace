// 真实后端就绪后，模拟外层超时强杀测试父进程，验证 IPC 断开后的退出
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

export async function verifyBackendTimeoutCleanup(uri) {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const helper = new URL("start-backend.js", import.meta.url).href;
  const code = `
    import { startTestBackend } from ${JSON.stringify(helper)};
    const child = startTestBackend(process.env.LIFECYCLE_MONGODB_URI, process.env.LIFECYCLE_PORT);
    child.stdout.on("data", chunk => {
      if (String(chunk).includes("backend listening on")) console.log("backend-ready:" + child.pid);
    });
    child.stderr.pipe(process.stderr);
    setInterval(() => {}, 1000);
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: { ...process.env, LIFECYCLE_MONGODB_URI: uri, LIFECYCLE_PORT: String(port) },
    encoding: "utf8", timeout: 5000, killSignal: "SIGKILL"
  });
  const match = result.stdout?.match(/backend-ready:(\d+)/);
  assert.ok(match, `后端应在超时前就绪：${result.stdout}\n${result.stderr}`);
  const pid = Number(match[1]);
  let exited = false;
  try {
    assert.equal(result.error?.code, "ETIMEDOUT", "应实际触发父进程强制超时");
    for (let i = 0; i < 50; i++) {
      try {
        process.kill(pid, 0);
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
        exited = true;
        break;
      }
      await delay(100);
    }
    assert.ok(exited, "超时强杀父进程后，真实后端应自动退出");
    await assert.rejects(fetch(`http://127.0.0.1:${port}/api/v1/health`, {
      signal: AbortSignal.timeout(1000)
    }), "后端端口应已释放");
  } finally {
    if (!exited) {
      try { process.kill(pid, "SIGKILL"); } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
  }
}
