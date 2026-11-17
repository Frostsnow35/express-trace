// 袋业务服务：状态机(BR-07) / 装件互斥(BR-08) / 袋扫件动写传播(FR-09,BR-09) / 影响面(FR-10)
import { Bag, BAG_TRANSITIONS, EXCEPTION_TYPES } from "../models/bag.js";
import { Order } from "../models/order.js";
import { nextSerial } from "../models/counter.js";
import { ApiError, ERROR_CODES } from "../core/errors.js";

/** 建袋（FR-08）：BG + yyyyMMdd + 4 位序列（BR-06） */
export async function createBag({ dest_node }) {
  if (!dest_node || typeof dest_node !== "string" || !dest_node.trim()) {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, "dest_node 必填");
  }
  const bag_no = await nextSerial("BG", 4);
  const now = new Date();
  return Bag.create({
    bag_no,
    dest_node: dest_node.trim(),
    status: "OPEN",
    order_nos: [],
    scans: [],
    created_at: now,
    updated_at: now
  });
}

/** 袋列表（03 §3.12）：可选状态筛选 + 分页，created_at 倒序 */
export async function listBags({ status, page = 1, pageSize = 10 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const [items, total] = await Promise.all([
    Bag.find(filter).sort({ created_at: -1 }).skip((p - 1) * ps).limit(ps).lean(),
    Bag.countDocuments(filter)
  ]);
  return { items, total, page: p, pageSize: ps };
}

/** 袋详情（03 §3.13）：含 scans 时间线 */
export async function getBag(bagNo) {
  const bag = await Bag.findOne({ bag_no: bagNo }).lean();
  if (!bag) throw new ApiError(ERROR_CODES.BAG_NOT_FOUND);
  return bag;
}

/** 装件（FR-08）：先件后袋两步写入，幂等可重试（document/03 §3.8） */
export async function addItem(bagNo, order_no) {
  const bag = await Bag.findOne({ bag_no: bagNo });
  if (!bag) throw new ApiError(ERROR_CODES.BAG_NOT_FOUND);
  if (bag.status !== "OPEN") throw new ApiError(ERROR_CODES.BAG_STATUS_ILLEGAL, "仅装件中(OPEN)的袋可装件");
  if (!order_no || typeof order_no !== "string") throw new ApiError(ERROR_CODES.PARAM_INVALID, "order_no 必填");

  const order = await Order.findOne({ order_no });
  if (!order) throw new ApiError(ERROR_CODES.ORDER_NOT_FOUND);
  // BR-08 互斥：已在其他袋 → 拒绝；已在本袋 → 幂等返回
  if (order.bag_no && order.bag_no !== bagNo) {
    throw new ApiError(ERROR_CODES.ORDER_ALREADY_IN_BAG, `订单已在袋 ${order.bag_no}`);
  }
  if (order.bag_no === bagNo && bag.order_nos.includes(order_no)) return bag;

  const now = new Date();
  await Order.updateOne({ order_no }, { $set: { bag_no: bagNo, updated_at: now } }); // 先件
  await Bag.updateOne({ bag_no: bagNo }, { $addToSet: { order_nos: order_no }, $set: { updated_at: now } }); // 后袋
  return Bag.findOne({ bag_no: bagNo });
}

/**
 * 袋级扫描（FR-08/09）：状态机 + 时序 + 写传播。
 * 写传播（02 §5 方案 A）：updateMany 管道更新，件轨迹 $push `[袋BGxxxx]` 前缀条目，
 * status 取件自身 current_status（不虚构件级状态，BR-01 语义不破坏）；
 * 幂等（T17）：件侧 `$not $elemMatch` 过滤器防重复追加，重放可补漏不可重复。
 */
export async function scanBag(bagNo, { time, node, action, type }) {
  const bag = await Bag.findOne({ bag_no: bagNo });
  if (!bag) throw new ApiError(ERROR_CODES.BAG_NOT_FOUND);

  const transition = BAG_TRANSITIONS[type];
  if (!transition) throw new ApiError(ERROR_CODES.PARAM_INVALID, "type 仅允许 SEAL/DEPART/ARRIVE/OPEN（异常走 /exception）");
  if (!node || typeof node !== "string") throw new ApiError(ERROR_CODES.PARAM_INVALID, "node 必填");
  if (!action || typeof action !== "string") throw new ApiError(ERROR_CODES.PARAM_INVALID, "action 必填");
  const scanTime = new Date(time);
  if (Number.isNaN(scanTime.getTime())) throw new ApiError(ERROR_CODES.PARAM_INVALID, "time 不合法");

  // 幂等重放（T17）：同 time+type+action 已记录 → 不重复落扫描，仅补传播（件侧过滤器兜底）
  const dup = bag.scans.some(
    (s) => s.time.getTime() === scanTime.getTime() && s.type === type && s.action === action
  );
  if (!dup) {
    // 时序（BR-02 同源规则）
    const last = bag.scans[bag.scans.length - 1];
    if (last && scanTime.getTime() < last.time.getTime()) {
      throw new ApiError(ERROR_CODES.TRACK_TIME_EARLY, "扫描时间早于最后一条袋扫描");
    }
    // 状态机（BR-07）：吸收态/非法跃迁
    if (!transition.from.includes(bag.status)) {
      throw new ApiError(ERROR_CODES.BAG_STATUS_ILLEGAL, `袋状态 ${bag.status} 不允许 ${type} 扫描`);
    }
    bag.scans.push({ time: scanTime, node, action, type });
    bag.status = transition.to;
    bag.updated_at = scanTime;
    await bag.save(); // 先写袋
  }

  const propagated_count = await propagateToOrders(bag, scanTime, node, action, type);
  return { bag: await Bag.findOne({ bag_no: bagNo }), propagated_count };
}

/**
 * 标记异常（FR-10 前置）：BROKEN/LOST 吸收态（BR-07）。
 * 已拆袋（OPENED）或已异常的袋拒绝标记（40902）。
 */
export async function markException(bagNo, { type, action }) {
  const bag = await Bag.findOne({ bag_no: bagNo });
  if (!bag) throw new ApiError(ERROR_CODES.BAG_NOT_FOUND);
  if (!EXCEPTION_TYPES.includes(type)) throw new ApiError(ERROR_CODES.PARAM_INVALID, "type 仅允许 BROKEN/LOST");
  if (!action || typeof action !== "string") throw new ApiError(ERROR_CODES.PARAM_INVALID, "action 必填");
  if (bag.status === "OPENED") throw new ApiError(ERROR_CODES.BAG_STATUS_ILLEGAL, "已拆袋不可标记异常");
  if (EXCEPTION_TYPES.includes(bag.status)) throw new ApiError(ERROR_CODES.BAG_STATUS_ILLEGAL, "异常态为吸收态，不可重复标记");

  const now = new Date();
  const node = bag.scans.length ? bag.scans[bag.scans.length - 1].node : bag.dest_node;
  bag.scans.push({ time: now, node, action, type: "EXCEPTION" });
  bag.status = type;
  bag.updated_at = now;
  await bag.save();
  return bag;
}

/**
 * 影响面分析（FR-10）：$match → $lookup → $facet
 * 输出受影响件清单 + 状态分布（02 §6 / 03 §3.11）
 */
export async function impact(bagNo) {
  const rows = await Bag.aggregate([
    { $match: { bag_no: bagNo } },
    { $lookup: { from: "orders", localField: "order_nos", foreignField: "order_no", as: "orders" } },
    {
      $facet: {
        meta: [
          {
            $project: {
              _id: 0,
              bag_no: 1,
              dest_node: 1,
              status: 1,
              affected_count: { $size: "$orders" },
              orders: {
                $map: {
                  input: "$orders",
                  as: "o",
                  in: {
                    order_no: "$$o.order_no",
                    current_status: "$$o.current_status",
                    current_node: "$$o.current_node",
                    receiver_name: "$$o.receiver.name",
                    receiver_phone: "$$o.receiver.phone"
                  }
                }
              }
            }
          }
        ],
        dist: [
          { $unwind: "$orders" },
          { $group: { _id: "$orders.current_status", count: { $sum: 1 } } }
        ]
      }
    }
  ]);
  const meta = rows[0]?.meta?.[0];
  if (!meta) throw new ApiError(ERROR_CODES.BAG_NOT_FOUND);
  const status_dist = {};
  for (const d of rows[0].dist) status_dist[d._id] = d.count;
  return { ...meta, status_dist };
}

// ---- 内部：写传播（02 §5 方案 A）----
// 件侧过滤三重保险：袋号命中 + 无同条轨迹（幂等 T17）+ 非签收（BR-01 终态禁止追加）
async function propagateToOrders(bag, scanTime, node, action, type) {
  const prefixed = `[袋${bag.bag_no}] ${action}`;
  const filter = {
    bag_no: bag.bag_no,
    current_status: { $ne: "DELIVERED" },
    tracking: { $not: { $elemMatch: { time: scanTime, action: prefixed } } }
  };
  const setStage = {
    tracking: {
      $concatArrays: ["$tracking", [{ time: scanTime, node, action: prefixed, status: "$current_status" }]]
    },
    current_node: node,
    updated_at: scanTime
  };
  // 拆袋（OPEN）会籍解除（BR-08）：件 bag_no 置空；袋 order_nos 保留快照（T15）
  if (type === "OPEN") setStage.bag_no = null;

  const res = await Order.updateMany(filter, [{ $set: setStage }]);
  return res.modifiedCount;
}
