// 全局错误处理中间件：ApiError → 对应 code + HTTP 状态；未知错误 → 50000
import { ApiError, ERROR_CODES } from "../core/errors.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ code: ERROR_CODES.INTERNAL, message: `路由不存在: ${req.method} ${req.path}`, data: null });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.httpStatus).json({ code: err.code, message: err.message, data: null });
  }
  console.error("[error]", err);
  return res.status(500).json({ code: ERROR_CODES.INTERNAL, message: "服务器内部错误", data: null });
}
