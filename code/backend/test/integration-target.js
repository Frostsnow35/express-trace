// 在连接数据库前核对临时容器身份、内存存储及实际端口映射
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function inspectContainer(id) {
  return JSON.parse(execFileSync("docker", ["inspect", id], { encoding: "utf8", timeout: 10000 }))[0];
}

export function verifyIntegrationTarget(uri, containerId, inspect = inspectContainer) {
  assert.match(containerId ?? "", /^[a-f0-9]{64}$/, "必须提供本次临时容器的完整 ID，禁止使用业务数据库");
  const url = new URL(uri);
  assert.equal(url.protocol, "mongodb:", "仅允许 MongoDB 直连");
  assert.equal(url.hostname, "127.0.0.1", "仅允许本机隔离测试实例");
  assert.equal(url.pathname, "/express_trace", "沿用项目约定数据库名");
  assert.ok(url.port && url.port !== "27017", "禁止连接默认业务端口 27017");
  assert.ok(!url.username && !url.password && !url.search && !url.hash, "测试连接串不允许凭据或额外选项");

  const info = inspect(containerId);
  assert.equal(info.Id, containerId, "容器 ID 不匹配");
  assert.equal(info.State.Running, true, "临时容器必须处于运行状态");
  assert.equal(info.Config.Image, "mongo:7", "仅允许已有 mongo:7 测试镜像");
  assert.equal(info.Config.Labels?.["express-trace.integration"], "issue7", "不是 #7 专属测试容器");
  assert.equal(info.HostConfig.AutoRemove, true, "测试容器必须自动移除");
  assert.ok(info.HostConfig.Tmpfs?.["/data/db"] && info.HostConfig.Tmpfs?.["/data/configdb"],
    "数据库必须使用内存存储");
  assert.ok(!info.HostConfig.Binds?.length && info.Mounts.every(({ Type }) => Type === "tmpfs"),
    "禁止测试容器挂载业务目录或持久化卷");
  assert.deepEqual(info.NetworkSettings.Ports["27017/tcp"], [{ HostIp: "127.0.0.1", HostPort: url.port }],
    "连接端口必须与本次临时容器映射一致");
}
