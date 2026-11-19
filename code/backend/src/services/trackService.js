// 公开查单（FR-06）：白名单投影，不读取寄收件人的姓名、电话或地址
import { Order } from "../models/order.js";
import { ApiError, ERROR_CODES } from "../core/errors.js";

export async function getTrack(orderNo) {
  const order = await Order.findOne({ order_no: orderNo })
    .select({ _id: 0, order_no: 1, current_status: 1, current_node: 1, tracking: 1 })
    .lean();
  if (!order) {
    throw new ApiError(ERROR_CODES.ORDER_NOT_FOUND, "未找到该订单，请检查单号");
  }
  order.tracking.sort((a, b) => new Date(a.time) - new Date(b.time));
  return order;
}
