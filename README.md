# 驿迹 ExpressTrace

基于 MongoDB 的快递物流轨迹追踪系统。
实现快递订单从创建、揽收、中转、派送至签收的全流程管理：新建订单、追加轨迹记录、单号轨迹查询、按状态/时间/网点多条件筛选、订单状态统计。

> 
> 核心亮点：**集包袋流转模型**
> 还原快递分拨中心集包业务：同流向小件打包成集包袋、整袋中转、到达目的地拆袋。
> 采用「袋扫件动」写传播逻辑：扫描集包袋时，批量同步更新袋内所有快件轨迹；
> 支持整袋影响面分析，通过聚合管道快速定位错扫、破损等异常波及的全部订单。
> 方案包含袋-件双层文档建模，同时对比了写传播、读推导两种实现思路，详情见 `document/02-数据模型设计.md`。

## 快速上手

```
# 1. 启动 MongoDB（Docker）
docker run -d --name express-trace-mongo -p 27017:27017 mongo:7

# 2. 初始化库表、索引与演示数据（可重复执行）
mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js
mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js
mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js

# 3. 启动前后端服务
cd code/backend
npm install
npm run dev

cd code/frontend
npm install
npm run dev
```

环境部署与测试细节参考 `document/04-测试与部署.md`

## 目录结构

```
├── data/            # 数据库脚本、备份文件
│   ├── init/        # 集合创建、索引、种子数据 mongosh 脚本
│   └── backup/      # mongodump 备份
├── code/
│   ├── backend/     # Node.js + Express + Mongoose
│   └── frontend/    # Vue3 + Vite
├── document/        # 项目全套设计文档
├── AGENTS.md        # 团队开发协作规范
└── 小组成员自我评价得分.txt
```

## 技术栈

| 层级 | 选型 |
| --- | --- |
| 数据库 | MongoDB 6+，订单内嵌轨迹数组，袋-件双层模型 |
| 后端 | Node.js 18+ / Express / Mongoose |
| 前端 | Vue 3 / Vite / Axios |
| 验证 | 接口自测，使用 explain() 校验索引效果 |

## 开发协作规范

项目采用 Issue + PR 流程开发，完整规则在 `AGENTS.md`：

1. Issue 评论 `认领` 任务，单人承接一个 issue
2. 基于 main 分支新建分支：`feat/<issue号>-<简要描述>`
3. 开发自测完成后，如果改动接口、数据模型，必须同步更新对应文档
4. 提交 PR，描述带上 `Closes #<issue号>`，经过互评、主理人审核后 squash 合并
5. main 分支禁止直接推送；commit 遵循 Conventional Commits 规范，例如 `feat(api): xxx`

## 文档清单

| 文档 | 内容说明 |
| --- | --- |
| document/01-需求分析.md | 选题背景、功能需求、业务规则、订单状态机、验收标准 |
| document/02-数据模型设计.md | MongoDB 文档结构、双层建模方案、写传播机制、聚合查询、索引设计、容量评估 |
| document/03-接口设计.md | REST 接口约定、错误码、页面与接口对应关系 |
| document/04-测试与部署.md | 环境搭建、初始化流程、测试方案、备份恢复 |
| document/06-开发计划.md | 里程碑规划、时间节点、风险与质量卡点 |
| document/07-开发规格.md | 代码、数据、测试的验收标准（DoD） |
| AGENTS.md | 分支管理、PR 规范、AI 使用说明 |
