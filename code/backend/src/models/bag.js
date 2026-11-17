// 集包袋模型（document/02 §3.4/3.5）
import mongoose from "mongoose";

export const BAG_STATUS = ["OPEN", "SEALED", "IN_TRANSIT", "ARRIVED", "OPENED", "BROKEN", "LOST"];
export const BAG_SCAN_TYPES = ["SEAL", "DEPART", "ARRIVE", "OPEN", "EXCEPTION"];
export const EXCEPTION_TYPES = ["BROKEN", "LOST"];

// 袋扫描类型 → 合法状态迁移（BR-07，document/03 §4）
export const BAG_TRANSITIONS = {
  SEAL: { from: ["OPEN"], to: "SEALED" },
  DEPART: { from: ["SEALED"], to: "IN_TRANSIT" },
  ARRIVE: { from: ["IN_TRANSIT"], to: "ARRIVED" },
  OPEN: { from: ["ARRIVED"], to: "OPENED" }
};

const scanSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    node: { type: String, required: true },
    action: { type: String, required: true },
    type: { type: String, enum: BAG_SCAN_TYPES, required: true }
  },
  { _id: false }
);

const bagSchema = new mongoose.Schema(
  {
    bag_no: { type: String, required: true, unique: true },
    dest_node: { type: String, required: true },
    status: { type: String, enum: BAG_STATUS, required: true },
    order_nos: { type: [String], default: [] },
    scans: { type: [scanSchema], default: [] },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
  },
  { versionKey: false }
);

export const Bag = mongoose.model("Bag", bagSchema);
