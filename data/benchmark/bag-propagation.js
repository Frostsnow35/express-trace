// bag-propagation.js — 袋扫件动：写传播 vs 读推导 对比实验（document/04 §4.3）
// 用法: node code/backend/node_modules/.bin/... —— 无依赖，直接用 mongosh 不便，故用 node + mongodb driver
// 运行: cd code/backend && npm i mongodb --no-save && node ../../data/benchmark/bag-propagation.js
// 口径: 单变量（只变机制）、每轮 ≥5 次取均值、原始数据输出到 stdout（归档进验收报告）

import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DB = "express_trace_bench"; // 独立库，不污染 express_trace
const N_ORDERS = 100;   // 袋内件数
const N_SCANS = 10;     // 袋扫次数
const ROUNDS = 5;       // 实验轮数

const T = (s) => new Date(s);

function stats(xs) {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean: +mean.toFixed(2), min: Math.min(...xs), max: Math.max(...xs), all: xs.map(x => +x.toFixed(2)) };
}

async function setup(db) {
  await db.dropDatabase();
  const orders = [];
  for (let i = 0; i < N_ORDERS; i++) {
    const orderNo = `ET20261117${String(i).padStart(6, "0")}`;
    orders.push({
      order_no: orderNo,
      sender: { name: "压测", phone: "13800000000", address: "压测地址" },
      receiver: { name: "压测", phone: "13900000000", address: "压测地址" },
      package: { weight_kg: 1, quantity: 1, category: "压测", remark: "" },
      current_status: "IN_TRANSIT",
      current_node: "广州天河分拨",
      bag_no: "BG202611170001",
      tracking: Array.from({ length: 5 }, (_, k) => ({
        time: T(`2026-11-1${k}T08:00:00+08:00`),
        node: `节点${k}`,
        action: `前置轨迹${k}`,
        status: "IN_TRANSIT"
      })),
      created_at: T("2026-11-10T08:00:00+08:00"),
      updated_at: T("2026-11-15T08:00:00+08:00")
    });
  }
  await db.collection("orders").insertMany(orders);
  await db.collection("orders").createIndex({ order_no: 1 }, { unique: true });
  await db.collection("orders").createIndex({ bag_no: 1 });
  await db.collection("bags").insertOne({
    bag_no: "BG202611170001",
    dest_node: "武汉中转场",
    status: "IN_TRANSIT",
    order_nos: orders.map(o => o.order_no),
    scans: [],
    created_at: T("2026-11-17T20:00:00+08:00"),
    updated_at: T("2026-11-17T20:00:00+08:00")
  });
}

async function benchWritePropagation(db) {
  // 方案 A：每次袋扫 → updateMany 为 100 件 $push 轨迹
  const times = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (let s = 0; s < N_SCANS; s++) {
      const t0 = performance.now();
      await db.collection("orders").updateMany(
        { bag_no: "BG202611170001" },
        {
          $push: { tracking: { time: new Date(), node: "压测网点", action: "[袋BG202611170001] 压测袋扫", status: "IN_TRANSIT" } },
          $set: { current_node: "压测网点", updated_at: new Date() }
        }
      );
      await db.collection("bags").updateOne(
        { bag_no: "BG202611170001" },
        { $push: { scans: { time: new Date(), node: "压测网点", action: "压测袋扫", type: "DEPART" } }, $set: { updated_at: new Date() } }
      );
      times.push(performance.now() - t0);
    }
  }
  return stats(times);
}

async function benchReadDerive(db) {
  // 方案 B 对照：读时推导 —— 单件轨迹 = 件 tracking ∪ 袋 scans（$lookup 归并）
  const times = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (let s = 0; s < N_SCANS; s++) {
      // 对照组同样先写袋 scans（单写）
      await db.collection("bags").updateOne(
        { bag_no: "BG202611170001" },
        { $push: { scans: { time: new Date(), node: "压测网点", action: "压测袋扫", type: "DEPART" } }, $set: { updated_at: new Date() } }
      );
      const t0 = performance.now();
      await db.collection("orders").aggregate([
        { $match: { order_no: "ET20261117000000" } },
        { $lookup: { from: "bags", localField: "bag_no", foreignField: "bag_no", as: "bag" } },
        { $unwind: { path: "$bag", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            merged: {
              $sortArray: {
                input: { $concatArrays: ["$tracking", { $ifNull: ["$bag.scans", []] }] },
                sortBy: { time: 1 }
              }
            }
          }
        }
      ]).toArray();
      times.push(performance.now() - t0);
    }
  }
  return stats(times);
}

async function benchReadFindOne(db) {
  // 方案 A 的读：findOne（对照）
  const times = [];
  for (let i = 0; i < ROUNDS * N_SCANS; i++) {
    const t0 = performance.now();
    await db.collection("orders").findOne({ order_no: "ET20261117000000" });
    times.push(performance.now() - t0);
  }
  return stats(times);
}

const client = new MongoClient(URI);
try {
  await client.connect();
  const db = client.db(DB);
  console.log(`[bench] setup: ${N_ORDERS} 件/袋, ${N_SCANS} 次袋扫, ${ROUNDS} 轮`);
  await setup(db);

  const writeA = await benchWritePropagation(db);
  const readA = await benchReadFindOne(db);
  const readB = await benchReadDerive(db);

  console.log("\n===== 原始数据（ms） =====");
  console.log("A 写传播-单次袋扫(100件 $push):", JSON.stringify(writeA));
  console.log("A 读-findOne 单件轨迹        :", JSON.stringify(readA));
  console.log("B 读-$lookup 推导单件轨迹    :", JSON.stringify(readB));
  console.log(`\n[bench] 各指标均为 ${ROUNDS * N_SCANS} 次采样的均值/最小/最大`);
  console.log("[bench] 结论由验收报告按数据判定，不在脚本预设");
} finally {
  await client.close();
}
