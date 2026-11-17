// 01-create-collections.js — 建库建集合 + JSON Schema 校验（幂等，可重复执行）
// 用法: mongosh mongodb://127.0.0.1:27017 data/init/01-create-collections.js

db = db.getSiblingDB("express_trace");

const orderStatusEnum = ["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

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
          pattern: "^ET[0-9]{10}$",
          description: "订单编号：ET + yyyyMMdd + 6位序列"
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
            weight_kg: { bsonType: "double", minimum: 0 },
            quantity: { bsonType: "int", minimum: 1 },
            category: { bsonType: "string" },
            remark: { bsonType: "string" }
          }
        },
        current_status: { enum: orderStatusEnum },
        current_node: { bsonType: "string" },
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
