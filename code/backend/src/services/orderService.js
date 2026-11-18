// 订单业务服务：创建订单（FR-01）= 入参校验 + BR-03 单号生成 + 初始状态
import { Order } from "../models/order.js";
import { nextSerial } from "../models/counter.js";
import { ApiError, ERROR_CODES } from "../core/errors.js";

// 订单刚创建、尚无首条轨迹时 current_node 的占位值（issue #4，需与前端 #9 对齐）
export const INITIAL_NODE = "待揽收";

const PARTY_FIELDS = ["name", "phone", "address"];

function isBlank(v) {
  return typeof v !== "string" || !v.trim();
}

function requireParty(body, key) {
  const party = body?.[key];
  if (!party || typeof party !== "object") {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, `${key} 必填`);
  }
  const out = {};
  for (const f of PARTY_FIELDS) {
    if (isBlank(party[f])) throw new ApiError(ERROR_CODES.PARAM_INVALID, `${key}.${f} 必填`);
    out[f] = party[f].trim();
  }
  return out;
}

function requirePackage(body) {
  const pkg = body?.package;
  if (!pkg || typeof pkg !== "object") {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, "package 必填");
  }
  if (typeof pkg.weight_kg !== "number" || !Number.isFinite(pkg.weight_kg) || pkg.weight_kg <= 0) {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, "package.weight_kg 必须为大于 0 的数字");
  }
  if (!Number.isInteger(pkg.quantity) || pkg.quantity < 1) {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, "package.quantity 必须为正整数");
  }
  if (isBlank(pkg.category)) throw new ApiError(ERROR_CODES.PARAM_INVALID, "package.category 必填");
  if (pkg.remark != null && typeof pkg.remark !== "string") {
    throw new ApiError(ERROR_CODES.PARAM_INVALID, "package.remark 必须为字符串");
  }
  return {
    weight_kg: pkg.weight_kg,
    quantity: pkg.quantity,
    category: pkg.category.trim(),
    remark: pkg.remark ?? ""
  };
}

/** 创建订单（FR-01）：单号 ET + yyyyMMdd + 6 位序列（BR-03），初始状态 CREATED */
export async function createOrder(body) {
  // 只取白名单字段，防止调用方越权写 order_no / current_status / bag_no 等
  const sender = requireParty(body, "sender");
  const receiver = requireParty(body, "receiver");
  const pkg = requirePackage(body);

  const order_no = await nextSerial("ET", 6);
  const now = new Date();
  return Order.create({
    order_no,
    sender,
    receiver,
    package: pkg,
    current_status: "CREATED",
    current_node: INITIAL_NODE,
    bag_no: null,
    tracking: [],
    created_at: now,
    updated_at: now
  });
}
