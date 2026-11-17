# code/backend — 驿迹 ExpressTrace 后端

技术栈：**Node.js 18+ / Express / Mongoose**。API 契约唯一事实来源是 [../../document/03-接口设计.md](../../document/03-接口设计.md)。

## 目录约定（实现时按此搭建）

```
backend/
├── src/
│   ├── routes/        # 路由定义（薄层，只做绑定）
│   ├── controllers/   # 参数解析、响应封装
│   ├── services/      # 业务逻辑：状态机校验、时序校验、编号生成
│   ├── models/        # Mongoose Schema（与 document/02 字段一一对应）
│   ├── middlewares/   # 统一错误处理、参数校验
│   └── app.js         # 入口
├── package.json
└── README.md
```

## 开发规范（摘自根目录 AGENTS.md）

- 分层固定 `routes → controllers → services → models`，状态机/时序等业务校验放 `services`；
- 状态枚举、订单编号格式不得擅自增改，唯一事实来源 [../../document/02-数据模型设计.md](../../document/02-数据模型设计.md)；
- 接口变更必须同步 document/03；commit 用 Conventional Commits：`feat(api): ...`。

## 启动

```bash
npm install
npm run dev     # 默认 3000 端口，连接 mongodb://127.0.0.1:27017/express_trace
```
