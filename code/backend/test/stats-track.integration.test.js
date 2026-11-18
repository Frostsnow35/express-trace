// 仅连接经 Docker 身份核验的空临时实例；正常入口为 npm run test:integration
import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import mongoose from "mongoose";
import { Order, ORDER_STATUS } from "../src/models/order.js";
import { verifyIntegrationTarget } from "./integration-target.js";
import { startTestBackend } from "./start-backend.js";
import { verifyBackendTimeoutCleanup } from "./backend-lifecycle.js";

const uri = process.env.INTEGRATION_MONGODB_URI;
const labels = ["已创建", "已揽收", "中转运输", "派送中", "已签收"];
const party = { name: "测试姓名", phone: "13800000000", address: "测试省测试市测试路1号" };
const body = { sender: party, receiver: party, package: { weight_kg: 1, quantity: 1, category: "文件" } };

test("统计与公开查单真实数据库及 HTTP 验收", { skip: !uri, timeout: 60000 }, async (t) => {
  verifyIntegrationTarget(uri, process.env.INTEGRATION_CONTAINER_ID);
  let child;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoCreate: false, autoIndex: false });
    assert.equal((await mongoose.connection.db.listCollections().toArray()).length, 0,
      "必须使用全新空库，防止写入已有业务数据；请使用独立临时容器");

    const port = process.env.INTEGRATION_PORT ?? "3107";
    child = startTestBackend(uri, port);
    let logs = "";
    child.stdout.on("data", (data) => { logs += data; });
    child.stderr.on("data", (data) => { logs += data; });
    for (let i = 0; i < 100 && !logs.includes("backend listening on"); i++) {
      assert.equal(child.exitCode, null, logs);
      await delay(100);
    }
    assert.match(logs, /backend listening on/, logs);

    async function request(path, payload) {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
        method: payload ? "POST" : "GET",
        ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
        signal: AbortSignal.timeout(5000)
      });
      return { status: response.status, body: await response.json() };
    }

    async function verifyCounts(expected) {
      const result = await request("/stats/status-count");
      assert.equal(result.status, 200);
      assert.equal(result.body.code, 0);
      const counts = await Promise.all(ORDER_STATUS.map((status) => Order.countDocuments({ current_status: status })));
      assert.deepEqual(counts, expected);
      assert.deepEqual(result.body.data.items, ORDER_STATUS.map((status, i) => ({
        status, label: labels[i], count: counts[i]
      })));
      assert.equal(result.body.data.total, await Order.countDocuments({}));
    }

    await t.test("空库返回五个零计数状态", () => verifyCounts([0, 0, 0, 0, 0]));

    let orderNo;
    await t.test("回归 #4：合法录入成功，缺手机号返回 40001", async () => {
      const created = await request("/orders", body);
      assert.equal(created.status, 201);
      orderNo = created.body.data.order_no;
      assert.match(orderNo, /^ET\d{14}$/);
      assert.equal(created.body.data.current_status, "CREATED");
      const invalid = await request("/orders", { ...body, receiver: { name: party.name, address: party.address } });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.code, 40001);
    });

    await t.test("部分状态无订单时补零，与 countDocuments 一致", () => verifyCounts([1, 0, 0, 0, 0]));

    await t.test("新建订单公开查询：仅四个字段，空轨迹，无隐私字段", async () => {
      const result = await request(`/track/${orderNo}`);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, {
        code: 0, message: "ok",
        data: { order_no: orderNo, current_status: "CREATED", current_node: "待揽收", tracking: [] }
      });
      for (const value of Object.values(party)) assert.ok(!JSON.stringify(result.body).includes(value));
    });

    const tracking = [
      { time: new Date("2026-11-18T03:00:00Z"), node: "武汉中转场", action: "到达中转场", status: "IN_TRANSIT" },
      { time: new Date("2026-11-18T01:00:00Z"), node: "深圳营业点", action: "已揽收", status: "PICKED_UP" }
    ];
    const fixtures = await Order.insertMany(ORDER_STATUS.map((status, i) => ({
      ...body, order_no: `ET2020010100000${i + 1}`, current_status: status, current_node: "测试网点",
      tracking: status === "IN_TRANSIT" ? tracking : [], created_at: new Date(), updated_at: new Date()
    })));
    const trackedOrderNo = fixtures[2].order_no;

    await t.test("全状态计数与 countDocuments 一致", () => verifyCounts([2, 1, 1, 1, 1]));

    await t.test("完整时间线升序返回，不泄露额外字段且不修改数据库", async () => {
      const before = await Order.findOne({ order_no: trackedOrderNo }).lean();
      const result = await request(`/track/${trackedOrderNo}?sender=1&receiver=1`);
      assert.equal(result.status, 200);
      assert.deepEqual(Object.keys(result.body.data).sort(), ["current_node", "current_status", "order_no", "tracking"]);
      assert.deepEqual(result.body.data.tracking, [...tracking].reverse().map((event) => ({
        ...event, time: event.time.toISOString()
      })));
      for (const value of Object.values(party)) assert.ok(!JSON.stringify(result.body).includes(value));
      assert.deepEqual(await Order.findOne({ order_no: trackedOrderNo }).lean(), before);
    });

    await t.test("不存在、前缀及特殊单号均返回约定 404，不进行模糊匹配", async () => {
      for (const value of ["ET00000000000000", "ET20200101", '{"$ne":null}']) {
        assert.deepEqual(await request(`/track/${encodeURIComponent(value)}`), {
          status: 404, body: { code: 40401, message: "未找到该订单，请检查单号", data: null }
        });
      }
    });

    await t.test("回归集包袋：建袋、装件、封袋、发运、只读查单展示传播轨迹", async () => {
      const created = await request("/bags", { dest_node: "测试中转场" });
      assert.equal(created.status, 201);
      const bagNo = created.body.data.bag_no;
      assert.equal((await request(`/bags/${bagNo}/items`, { order_no: orderNo })).body.code, 0);
      for (const [type, time] of [["SEAL", "2099-01-01T01:00:00Z"], ["DEPART", "2099-01-01T02:00:00Z"]]) {
        const scanned = await request(`/bags/${bagNo}/scan`, { type, time, node: "测试分拨", action: type });
        assert.equal(scanned.body.code, 0);
        assert.equal(scanned.body.data.propagated_count, 1);
      }
      const result = await request(`/track/${orderNo}`);
      assert.equal(result.body.data.tracking.length, 2);
      assert.equal(result.body.data.current_node, "测试分拨");
      assert.equal((await request("/bags")).body.code, 0);
      await verifyCounts([2, 1, 1, 1, 1]);
    });

    await t.test("测试父进程被强制超时终止后，真实后端自动退出并释放端口", () =>
      verifyBackendTimeoutCleanup(uri));
  } finally {
    try {
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill();
        await exited;
      }
    } finally {
      await mongoose.disconnect();
    }
  }
});
