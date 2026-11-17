# data/backup — 数据备份

本目录存放 `mongodump` 备份产物，课程提交须包含**一份全量备份**。
**统一使用 archive + gzip 格式**（mongodump 100.20.x 目录格式恢复有解析缺陷，勿用 `--out=` 目录格式）。

## 生成备份

```bash
# 先保证数据非空（初始化 + 种子数据）
mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js
mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js
mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js

# 全量备份（archive+gzip 单文件，带日期）
mongodump --uri="mongodb://127.0.0.1:27017" --db=express_trace \
  --archive=data/backup/express_trace_$(date +%Y%m%d).archive.gz --gzip
```

## 恢复验证

```bash
mongosh mongodb://127.0.0.1:27017 --eval "db.getSiblingDB('express_trace').dropDatabase()"
mongorestore --uri="mongodb://127.0.0.1:27017" --db=express_trace --drop \
  --archive=data/backup/express_trace_<日期>.archive.gz --gzip

# 恢复后重建索引（archive 不携带索引定义）
mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js

# 核对计数（订单与袋均应与备份前一致）
mongosh mongodb://127.0.0.1:27017 --eval "print(db.getSiblingDB('express_trace').orders.countDocuments({}), db.getSiblingDB('express_trace').bags.countDocuments({}))"
```

一键验证脚本：`data/init/04-verify-backup.sh`（seed → dump → drop → restore → count，对照 document/04 测试项 T10）。

当前归档：`20261117/express_trace_20261117.archive.gz`（8 单 2 袋）。
