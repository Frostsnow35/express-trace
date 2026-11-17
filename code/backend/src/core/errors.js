// 统一业务错误（错误码表见 document/03 §1）
export const ERROR_CODES = {
  OK: 0,
  PARAM_INVALID: 40001,
  TRACK_TIME_EARLY: 40002,
  ORDER_NOT_FOUND: 40401,
  BAG_NOT_FOUND: 40402,
  ORDER_STATUS_ILLEGAL: 40901,
  BAG_STATUS_ILLEGAL: 40902,
  ORDER_ALREADY_IN_BAG: 40903,
  INTERNAL: 50000
};

const DEFAULT_MESSAGES = {
  40001: "参数校验失败",
  40002: "轨迹时间早于最后一条",
  40401: "订单不存在",
  40402: "集包袋不存在",
  40901: "订单状态流转非法",
  40902: "袋状态流转非法",
  40903: "订单已在其他袋中",
  50000: "服务器内部错误"
};

export class ApiError extends Error {
  constructor(code, message) {
    super(message ?? DEFAULT_MESSAGES[code] ?? "未知错误");
    this.code = code;
    this.httpStatus = httpStatusOf(code);
  }
}

function httpStatusOf(code) {
  if (code === 0) return 200;
  if (code === 50000) return 500;
  const s = String(code);
  return Number(s.slice(0, 3)); // 400xx→400, 404xx→404, 409xx→409
}
