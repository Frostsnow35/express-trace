import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyIntegrationTarget } from "./integration-target.js";

const id = "a".repeat(64);
const uri = "mongodb://127.0.0.1:32768/express_trace";
function container() {
  return {
    Id: id,
    State: { Running: true },
    Config: { Image: "mongo:7", Labels: { "express-trace.integration": "issue7" } },
    HostConfig: { AutoRemove: true, Tmpfs: { "/data/db": "rw,size=512m", "/data/configdb": "rw,size=64m" } },
    Mounts: [],
    NetworkSettings: { Ports: { "27017/tcp": [{ HostIp: "127.0.0.1", HostPort: "32768" }] } }
  };
}

test("允许身份和端口一致的内存测试容器", () => {
  assert.doesNotThrow(() => verifyIntegrationTarget(uri, id, container));
});

test("缺少完整容器 ID 时在检查和连接前拒绝", () => {
  assert.throws(() => verifyIntegrationTarget(uri, undefined, () => {
    assert.fail("不应查询 Docker 或连接数据库");
  }), /必须提供本次临时容器/);
});

test("默认业务端口、远程主机、其他库及额外连接选项均拒绝", () => {
  for (const invalid of [
    "mongodb://127.0.0.1:27017/express_trace",
    "mongodb://example.com:32768/express_trace",
    "mongodb://127.0.0.1:32768/other",
    `${uri}?replicaSet=test`,
    "mongodb://user:password@127.0.0.1:32768/express_trace"
  ]) {
    let inspected = false;
    assert.throws(() => verifyIntegrationTarget(invalid, id, () => {
      inspected = true;
      return container();
    }), assert.AssertionError);
    assert.equal(inspected, false, "非法连接串不应查询 Docker");
  }
});

test("容器身份不符、缺少标签或非自动移除均拒绝", () => {
  for (const change of [
    (info) => { info.Id = "b".repeat(64); },
    (info) => { info.State.Running = false; },
    (info) => { info.Config.Labels = {}; },
    (info) => { info.HostConfig.AutoRemove = false; }
  ]) {
    const info = container();
    change(info);
    assert.throws(() => verifyIntegrationTarget(uri, id, () => info), assert.AssertionError);
  }
});

test("持久化卷或宿主目录挂载均拒绝", () => {
  for (const Type of ["volume", "bind"]) {
    const info = container();
    info.Mounts.push({ Type });
    assert.throws(() => verifyIntegrationTarget(uri, id, () => info), /禁止测试容器挂载/);
  }
  const info = container();
  delete info.HostConfig.Tmpfs;
  assert.throws(() => verifyIntegrationTarget(uri, id, () => info), /必须使用内存存储/);
});

test("映射不符、额外网卡映射均拒绝", () => {
  const info = container();
  info.NetworkSettings.Ports["27017/tcp"][0].HostPort = "32769";
  assert.throws(() => verifyIntegrationTarget(uri, id, () => info), /映射一致/);
  info.NetworkSettings.Ports["27017/tcp"] = [{ HostIp: "0.0.0.0", HostPort: "32768" }];
  assert.throws(() => verifyIntegrationTarget(uri, id, () => info), /映射一致/);
});
