// 订单模型（document/02 §3.2/3.3）
import mongoose from "mongoose";

export const ORDER_STATUS = ["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

const trackingSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    node: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUS, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    order_no: { type: String, required: true, unique: true },
    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true }
    },
    receiver: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true }
    },
    package: {
      weight_kg: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 1 },
      category: { type: String, required: true },
      remark: { type: String, default: "" }
    },
    current_status: { type: String, enum: ORDER_STATUS, required: true },
    current_node: { type: String, required: true },
    bag_no: { type: String, default: null },
    tracking: { type: [trackingSchema], default: [] },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
  },
  { versionKey: false }
);

export const Order = mongoose.model("Order", orderSchema);
