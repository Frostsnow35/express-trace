// 袋接口封装（document/03 §3.7~3.13）
import http from "./http.js";

export const bagsApi = {
  create: (dest_node) => http.post("/bags", { dest_node }),
  list: (params) => http.get("/bags", { params }),
  detail: (bagNo) => http.get(`/bags/${bagNo}`),
  addItem: (bagNo, order_no) => http.post(`/bags/${bagNo}/items`, { order_no }),
  scan: (bagNo, payload) => http.post(`/bags/${bagNo}/scan`, payload),
  markException: (bagNo, payload) => http.post(`/bags/${bagNo}/exception`, payload),
  impact: (bagNo) => http.get(`/bags/${bagNo}/impact`)
};
