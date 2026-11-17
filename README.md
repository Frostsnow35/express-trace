# 驿迹 ExpressTrace

> 基于 MongoDB 文档数据库的快递物流轨迹追踪系统 ｜ NoSQL 团队课设
> Express logistics tracking system built on MongoDB.

快递订单从创建、揽收、中转、派送直至签收的完整流程管理：订单录入、轨迹时序追加、单号查全轨迹、按状态/时间/网点组合筛选、状态数量统计。

## 快速开始（开发者 3 分钟上手）

```bash
# 1. 起 MongoDB（Docker）
docker run -d --name express-trace-mongo -p 27017:27017 mongo:7

# 2. 初始化数据库（建集合/索引/演示数据，可重复执行）
mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js
mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js
mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js

# 3. 起后端（:3000）与前端（:5173）
cd code/backend && npm install && npm run dev
cd code/frontend && npm install && npm run dev
```

详细环境与测试见 [document/04-测试与部署.md](document/04-测试与部署.md)。

## 仓库结构

```
├── data/            # 数据库创建脚本、数据备份
│   ├── init/        #   建集合、建索引、种子数据（mongosh 脚本）
│   └── backup/      #   mongodump 备份产物
├── code/
│   ├── backend/     # Node.js + Express + Mongoose
│   └── frontend/    # Vue 3 + Vite
├── document/        # 技术文档
│   ├── 01-需求分析.md
│   ├── 02-数据模型设计.md
│   ├── 03-接口设计.md
│   └── 04-测试与部署.md
├── AGENTS.md        # 团队开发贡献规范（必读）
└── 小组成员自我评价得分.txt
```

## 技术栈

| 层 | 选型 |
|---|---|
| 数据库 | MongoDB 6+（文档模型：订单单文档内嵌轨迹数组） |
| 后端 | Node.js 18+ / Express / Mongoose |
| 前端 | Vue 3 / Vite / Axios |
| 测试 | 接口自测清单 + `explain()` 索引验证（document/04） |

## 开发协作（Issue → PR 模式）

**本仓库采用主理人发布 issue、成员提交 PR 的协作模式，完整规范见 [AGENTS.md](AGENTS.md)，以下为速查：**

1. 在 issue 下评论 `认领`，一人一 issue；
2. 从 `main` 拉分支：`feat/<issue号>-<简述>`；
3. 开发 + 自测，API/数据模型变更**同步更新 document/ 对应文档**；
4. 提 PR（描述里写 `Closes #<issue号>`），走互评 + 主理人终审，Squash 合并；
5. `main` 禁止直推；commit 用 Conventional Commits：`feat(api): ...`。

## 文档索引

| 文档 | 内容 |
|---|---|
| [document/01-需求分析.md](document/01-需求分析.md) | 选题、功能需求、业务规则、状态机、验收标准 |
| [document/02-数据模型设计.md](document/02-数据模型设计.md) | MongoDB 文档结构、内嵌建模决策、索引、聚合、容量评估 |
| [document/03-接口设计.md](document/03-接口设计.md) | REST API 契约、错误码、页面-接口映射 |
| [document/04-测试与部署.md](document/04-测试与部署.md) | 环境、初始化、测试计划、备份恢复 |
| [AGENTS.md](AGENTS.md) | 分支/issue/PR/代码规范、AI 辅助声明 |

## 团队成员

见 [小组成员自我评价得分.txt](小组成员自我评价得分.txt)（成员信息以该文件登记为准）。
