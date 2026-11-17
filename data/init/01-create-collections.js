// 01-create-collections.js — 建库建集合 + JSON Schema 校验（幂等，可重复执行）
// 用法: mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js

db = db.getSiblingDB("express_trace");

const orderStatusEnum = ["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
const bagStatusEnum = ["OPEN", "SEALED", "IN_TRANSIT", "ARRIVED", "OPENED", "BROKEN", "LOST"];
const bagScanTypeEnum = ["SEAL", "DEPART", "ARRIVE", "OPEN", "EXCEPTION"];

// 若集合已存在则先移除 validator 再重建（幂等）
if (db.getCollectionNames().includes("orders")) {
  db.runCommand({ collMod: "orders", validator: {}, validationLevel: "off" });
} else {
  db.createCollection("orders");
}

db.runCommand({
  collMod: "orders",
  validationLevel: "moderate",
  validationAction: "error",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["order_no", "sender", "receiver", "package", "current_status", "current_node", "tracking", "created_at", "updated_at"],
      properties: {
        order_no: {
          bsonType: "string",
          pattern: "^ET[0-9]{14}$",
          description: "订单编号：ET + yyyyMMdd(8) + 6位序列，共14位数字（BR-03）"
        },
        sender: {
          bsonType: "object",
          required: ["name", "phone", "address"],
          properties: {
            name: { bsonType: "string" },
            phone: { bsonType: "string" },
            address: { bsonType: "string" }
          }
        },
        receiver: {
          bsonType: "object",
          required: ["name", "phone", "address"],
          properties: {
            name: { bsonType: "string" },
            phone: { bsonType: "string" },
            address: { bsonType: "string" }
          }
        },
        package: {
          bsonType: "object",
          required: ["weight_kg", "quantity", "category"],
          properties: {
            weight_kg: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
            quantity: { bsonType: ["int", "long", "double"], minimum: 1 },
            category: { bsonType: "string" },
            remark: { bsonType: "string" }
          }
        },
        current_status: { enum: orderStatusEnum },
        current_node: { bsonType: "string" },
        bag_no: {
          bsonType: ["string", "null"],
          pattern: "^BG[0-9]{12}$",
          description: "当前所在集包袋（BG + yyyyMMdd(8) + 4位序列）；null 表示不在袋（BR-06/08）"
        },
        tracking: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["time", "node", "action", "status"],
            properties: {
              time: { bsonType: "date" },
              node: { bsonType: "string" },
              action: { bsonType: "string" },
              status: { enum: orderStatusEnum }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

print("✔ express_trace.orders 集合与校验规则就绪");

// ---- bags（集包袋，FR-08~10）----
if (db.getCollectionNames().includes("bags")) {
  db.runCommand({ collMod: "bags", validator: {}, validationLevel: "off" });
} else {
  db.createCollection("bags");
}

db.runCommand({
  collMod: "bags",
  validationLevel: "moderate",
  validationAction: "error",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["bag_no", "dest_node", "status", "order_nos", "scans", "created_at", "updated_at"],
      properties: {
        bag_no: {
          bsonType: "string",
          pattern: "^BG[0-9]{12}$",
          description: "袋号：BG + yyyyMMdd + 4位序列（BR-06）"
        },
        dest_node: { bsonType: "string" },
        status: { enum: bagStatusEnum },
        order_nos: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "袋内件清单（FR-08 装件登记）"
        },
        scans: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["time", "node", "action", "type"],
            properties: {
              time: { bsonType: "date" },
              node: { bsonType: "string" },
              action: { bsonType: "string" },
              type: { enum: bagScanTypeEnum }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

print("✔ express_trace.bags 集合与校验规则就绪");
