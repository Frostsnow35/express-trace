// 公开查单控制器：解析单号并封装响应
import { ok } from "../core/response.js";
import * as trackService from "../services/trackService.js";

export async function getTrack(req, res, next) {
  try {
    ok(res, await trackService.getTrack(req.params.orderNo));
  } catch (e) {
    next(e);
  }
}
