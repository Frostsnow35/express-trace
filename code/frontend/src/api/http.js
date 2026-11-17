// Axios 封装：统一解包 {code, message, data}（document/03 §1）
import axios from "axios";

const http = axios.create({ baseURL: "/api/v1", timeout: 10000 });

http.interceptors.response.use(
  (resp) => {
    const body = resp.data;
    if (body.code === 0) return body.data;
    // 业务错误：抛出带 code 的 Error，页面可读 message（ERROR_TEXT 兜底）
    const err = new Error(body.message || "请求失败");
    err.code = body.code;
    return Promise.reject(err);
  },
  (error) => {
    // HTTP 层错误（404/500 等）：后端统一封装里也带 code/message
    const data = error.response?.data;
    const err = new Error(data?.message || error.message || "网络错误");
    err.code = data?.code ?? -1;
    return Promise.reject(err);
  }
);

export default http;
