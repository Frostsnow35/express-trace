// 02-create-indexes.js — 创建索引（幂等，可重复执行）
// 用法: mongosh mongodb://127.0.0.1:27017 data/init/02-create-indexes.js
// 索引设计依据: document/02-数据模型设计.md §4

db = db.getSiblingDB("express_trace");

db.orders.createIndex({ order_no: 1 }, { unique: true, name: "idx_order_no" });
db.orders.createIndex({ current_status: 1, created_at: -1 }, { name: "idx_status_created" });
db.orders.createIndex({ current_node: 1 }, { name: "idx_node" });
db.orders.createIndex({ created_at: -1 }, { name: "idx_created" });
db.orders.createIndex({ bag_no: 1 }, { name: "idx_order_bag" });        // FR-09 写传播圈件 / 影响面反查
db.bags.createIndex({ bag_no: 1 }, { unique: true, name: "idx_bag_no" }); // FR-08 袋主键

print("✔ 索引就绪：");
printjson(db.orders.getIndexes().map(i => i.name));
printjson(db.bags.getIndexes().map(i => i.name));
