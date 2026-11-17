# code/frontend — 驿迹 ExpressTrace 前端

技术栈：**Vue 3 / Vite / Axios**。页面与接口映射见 [../../document/03-接口设计.md](../../document/03-接口设计.md) §5。

## 目录约定（实现时按此搭建）

```
frontend/
├── src/
│   ├── views/         # 页面：工作台、订单列表、订单详情、新建订单、公开查单
│   ├── components/    # 轨迹时间线、筛选表单、状态徽标等
│   ├── api/           # Axios 封装与接口调用（与 document/03 一一对应）
│   ├── router/        # 路由（/、/orders、/orders/:orderNo、/orders/new、/track）
│   └── main.js
├── vite.config.js     # 代理 /api → http://localhost:3000
└── README.md
```

## 开发规范（摘自根目录 AGENTS.md）

- 路由结构与 document/03 §5 映射表保持一致；
- 状态枚举中文名直接用 document/03 §4 的 label，不另行硬编码；
- 涉及界面改动的 PR 附截图。

## 启动

```bash
npm install
npm run dev     # 默认 5173 端口
```
