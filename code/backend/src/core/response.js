// 统一响应封装：{code, message, data}
export function ok(res, data = null, httpStatus = 200) {
  return res.status(httpStatus).json({ code: 0, message: "ok", data });
}

export function fail(res, code, message, httpStatus = 400) {
  return res.status(httpStatus).json({ code, message, data: null });
}
