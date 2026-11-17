# data/backup — 数据备份

本目录存放 `mongodump` 备份产物，课程提交须包含**一份全量备份**。

## 生成备份

```bash
# 先保证数据非空（初始化 + 种子数据）
mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js
mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js
mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js

# 全量备份（目录以日期命名）
mongodump --uri="mongodb://127.0.0.1:27017" --db=express_trace --out=data/backup/$(date +%Y%m%d)
```

## 恢复验证

```bash
mongosh mongodb://127.0.0.1:27017 --eval "db.getSiblingDB('express_trace').dropDatabase()"
mongorestore --uri="mongodb://127.0.0.1:27017" --db=express_trace --drop data/backup/<日期>/express_trace
mongosh mongodb://127.0.0.1:27017 --eval "print(db.getSiblingDB('express_trace').orders.countDocuments({}))"
```

恢复后订单数应与备份前一致（对照 document/04 测试项 T10）。
