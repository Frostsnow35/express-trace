// 运行配置（环境变量白名单读取，缺失给默认值）
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/express_trace"
};
