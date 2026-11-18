// 状态统计（FR-05）：按订单当前状态聚合，并补齐零计数状态
import { Order, ORDER_STATUS } from "../models/order.js";

const STATUS_LABELS = {
  CREATED: "已创建",
  PICKED_UP: "已揽收",
  IN_TRANSIT: "中转运输",
  OUT_FOR_DELIVERY: "派送中",
  DELIVERED: "已签收"
};

export async function getStatusCount() {
  const groups = await Order.aggregate([
    { $group: { _id: "$current_status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const counts = new Map(groups.map(({ _id, count }) => [_id, count]));
  return {
    total: groups.reduce((total, { count }) => total + count, 0),
    items: ORDER_STATUS.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts.get(status) ?? 0
    }))
  };
}
