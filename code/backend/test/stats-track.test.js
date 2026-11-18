import assert from "node:assert/strict";
import { test } from "node:test";
import { Order, ORDER_STATUS } from "../src/models/order.js";
import { getStatusCount } from "../src/services/statsService.js";
import { getTrack } from "../src/services/trackService.js";

const LABELS = ["已创建", "已揽收", "中转运输", "派送中", "已签收"];

// 用可恢复的替身兼容 Node.js 18，不依赖较新版本的 node:test mock API
async function withOrderMethod(name, implementation, verify) {
  const original = Order[name];
  const calls = [];
  Order[name] = (...args) => {
    calls.push(args);
    return implementation(...args);
  };
  try {
    await verify(calls);
  } finally {
    Order[name] = original;
  }
}

test("状态统计使用约定聚合管道，并按业务顺序补齐零计数", async () => {
  await withOrderMethod("aggregate", async () => [
    { _id: "DELIVERED", count: 2 },
    { _id: "CREATED", count: 3 }
  ], async (calls) => {
    const result = await getStatusCount();
    assert.deepEqual(calls[0][0], [
      { $group: { _id: "$current_status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    assert.deepEqual(result, {
      total: 5,
      items: ORDER_STATUS.map((status, i) => ({
        status, label: LABELS[i], count: [3, 0, 0, 0, 2][i]
      }))
    });
  });
});

test("空库仍返回全部五种状态且总量为零", async () => {
  await withOrderMethod("aggregate", async () => [], async () => {
    const result = await getStatusCount();
    assert.equal(result.total, 0);
    assert.equal(result.items.length, 5);
    assert.ok(result.items.every(({ count }) => count === 0));
  });
});

test("五种状态全部有订单时，总量等于各组计数之和", async () => {
  await withOrderMethod("aggregate", async () => ORDER_STATUS.map((status, i) => ({
    _id: status, count: i + 1
  })), async () => {
    const result = await getStatusCount();
    assert.equal(result.total, 15);
    assert.deepEqual(result.items.map(({ count }) => count), [1, 2, 3, 4, 5]);
  });
});

test("公开查单按单号精确查询，使用白名单投影并返回完整升序轨迹", async () => {
  const order = {
    order_no: "ET20261118000001",
    current_status: "IN_TRANSIT",
    current_node: "武汉中转场",
    tracking: [
      { time: new Date("2026-11-18T03:00:00Z"), node: "武汉中转场", action: "到达", status: "IN_TRANSIT" },
      { time: new Date("2026-11-18T01:00:00Z"), node: "深圳网点", action: "揽收", status: "PICKED_UP" }
    ]
  };
  let projection;
  await withOrderMethod("findOne", () => ({
    select(fields) {
      projection = fields;
      return { lean: async () => order };
    }
  }), async (calls) => {
    const result = await getTrack(order.order_no);
    assert.deepEqual(calls[0][0], { order_no: order.order_no });
    assert.deepEqual(projection, {
      _id: 0, order_no: 1, current_status: 1, current_node: 1, tracking: 1
    });
    assert.deepEqual(result.tracking.map(({ action }) => action), ["揽收", "到达"]);
    assert.equal(result.tracking.length, 2);
  });
});

test("新建订单查单返回空轨迹", async () => {
  await withOrderMethod("findOne", () => ({
    select: () => ({ lean: async () => ({ tracking: [] }) })
  }), async () => {
    assert.deepEqual((await getTrack("ET20261118000001")).tracking, []);
  });
});

test("不存在的单号返回 40401 和公开查单专用文案", async () => {
  await withOrderMethod("findOne", () => ({
    select: () => ({ lean: async () => null })
  }), async () => {
    await assert.rejects(getTrack("ET20261118999999"), {
      code: 40401, httpStatus: 404, message: "未找到该订单，请检查单号"
    });
  });
});

test("统计数据库异常向上传递", async () => {
  const error = new Error("统计连接失败");
  await withOrderMethod("aggregate", async () => { throw error; }, async () => {
    await assert.rejects(getStatusCount(), error);
  });
});

test("查单数据库异常向上传递", async () => {
  const error = new Error("查单连接失败");
  await withOrderMethod("findOne", () => ({
    select: () => ({ lean: async () => { throw error; } })
  }), async () => {
    await assert.rejects(getTrack("ET20261118000001"), error);
  });
});
