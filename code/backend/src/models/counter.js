// 日序列号生成器：BG/ET + yyyyMMdd + N 位序列，$inc 自增保证并发安全（BR-03/06）
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

const Counter = mongoose.model("Counter", counterSchema);

export function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** 生成编号：prefix + yyyymmdd + width 位自增序列 */
export async function nextSerial(prefix, width = 4) {
  const key = `${prefix}${ymd()}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `${key}${String(doc.seq).padStart(width, "0")}`;
}
