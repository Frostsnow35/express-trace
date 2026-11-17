// 状态枚举单一来源：document/03 §4（前后端共享，禁止私造别名 — 07 §1）

export const ORDER_STATUS = [
  { value: "CREATED", label: "已创建", color: "#57606a" },
  { value: "PICKED_UP", label: "已揽收", color: "#0969da" },
  { value: "IN_TRANSIT", label: "中转运输", color: "#bc4c00" },
  { value: "OUT_FOR_DELIVERY", label: "派送中", color: "#8250df" },
  { value: "DELIVERED", label: "已签收", color: "#1a7f37" }
];

export const BAG_STATUS = [
  { value: "OPEN", label: "装件中", color: "#0969da" },
  { value: "SEALED", label: "已封袋", color: "#1a7f37" },
  { value: "IN_TRANSIT", label: "干线在途", color: "#bc4c00" },
  { value: "ARRIVED", label: "已到港", color: "#8250df" },
  { value: "OPENED", label: "已拆袋", color: "#57606a" },
  { value: "BROKEN", label: "破损", color: "#cf222e" },
  { value: "LOST", label: "丢失", color: "#82071e" }
];

export const BAG_SCAN_TYPES = [
  { value: "SEAL", label: "封袋" },
  { value: "DEPART", label: "干线发运" },
  { value: "ARRIVE", label: "到港" },
  { value: "OPEN", label: "拆袋" }
];

// 袋扫描类型 → 合法状态迁移（BR-07，与后端 bag.js BAG_TRANSITIONS 一致）
export const BAG_TRANSITIONS = {
  SEAL: { from: ["OPEN"], to: "SEALED" },
  DEPART: { from: ["SEALED"], to: "IN_TRANSIT" },
  ARRIVE: { from: ["IN_TRANSIT"], to: "ARRIVED" },
  OPEN: { from: ["ARRIVED"], to: "OPENED" }
};

// 错误码 → 用户可读文案（document/03 §1）
export const ERROR_TEXT = {
  40001: "参数校验失败",
  40002: "时间早于最后一条记录",
  40401: "订单不存在",
  40402: "集包袋不存在",
  40901: "订单状态流转非法",
  40902: "袋状态流转非法",
  40903: "订单已在其他袋中"
};

export function statusMeta(list, value) {
  return list.find((s) => s.value === value) ?? { value, label: value, color: "#57606a" };
}
