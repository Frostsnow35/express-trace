// 统计控制器：业务聚合在 service，统一响应在 core
import { ok } from "../core/response.js";
import * as statsService from "../services/statsService.js";

export async function getStatusCount(req, res, next) {
  try {
    ok(res, await statsService.getStatusCount());
  } catch (e) {
    next(e);
  }
}
