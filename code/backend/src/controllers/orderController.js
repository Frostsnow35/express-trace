// 订单控制器：参数解析 + 响应封装，业务校验在 service（07 §3）
import { ok } from "../core/response.js";
import * as orderService from "../services/orderService.js";

export async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.body ?? {});
    ok(res, order, 201);
  } catch (e) {
    next(e);
  }
}
