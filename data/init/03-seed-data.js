// 03-seed-data.js — 演示数据（幂等：按 order_no upsert）
// 用法: mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js
// 覆盖 5 种状态各至少 1 单，用于 FR-04 筛选与 FR-05 统计演示

db = db.getSiblingDB("express_trace");

const T = (s) => new Date(s);

const seed = [
  {
    order_no: "ET20261117000001",
    sender: { name: "张三", phone: "13800000001", address: "广东省深圳市南山区科技园路1号" },
    receiver: { name: "李四", phone: "13900000002", address: "北京市海淀区中关村大街2号" },
    package: { weight_kg: NumberDecimal("2.5"), quantity: NumberInt(1), category: "日用品", remark: "易碎，轻拿轻放" },
    current_status: "CREATED",
    current_node: "深圳南山营业点",
    tracking: [],
    created_at: T("2026-11-17T08:58:00+08:00"),
    updated_at: T("2026-11-17T08:58:00+08:00")
  },
  {
    order_no: "ET20261117000002",
    sender: { name: "王五", phone: "13700000003", address: "广东省广州市天河区体育西路10号" },
    receiver: { name: "赵六", phone: "13600000004", address: "上海市浦东新区世纪大道100号" },
    package: { weight_kg: NumberDecimal("1.0"), quantity: NumberInt(2), category: "文件", remark: "" },
    current_status: "PICKED_UP",
    current_node: "广州天河营业点",
    tracking: [
      { time: T("2026-11-17T10:30:00+08:00"), node: "广州天河营业点", action: "已揽收，快递员陈七取件", status: "PICKED_UP" }
    ],
    created_at: T("2026-11-17T10:00:00+08:00"),
    updated_at: T("2026-11-17T10:30:00+08:00")
  },
  {
    order_no: "ET20261117000003",
    sender: { name: "孙八", phone: "13500000005", address: "湖北省武汉市洪山区珞喻路129号" },
    receiver: { name: "周九", phone: "13400000006", address: "湖南省长沙市岳麓区麓山南路932号" },
    package: { weight_kg: NumberDecimal("5.2"), quantity: NumberInt(1), category: "电子产品", remark: "含电池" },
    current_status: "IN_TRANSIT",
    current_node: "武汉中转场",
    tracking: [
      { time: T("2026-11-17T14:00:00+08:00"), node: "武汉洪山营业点", action: "已揽收，快递员吴十取件", status: "PICKED_UP" },
      { time: T("2026-11-18T02:30:00+08:00"), node: "武汉中转场", action: "快件到达武汉中转场，发往长沙", status: "IN_TRANSIT" }
    ],
    created_at: T("2026-11-17T13:30:00+08:00"),
    updated_at: T("2026-11-18T02:30:00+08:00")
  },
  {
    order_no: "ET20261116000004",
    sender: { name: "郑一", phone: "13300000007", address: "四川省成都市武侯区人民南路四段1号" },
    receiver: { name: "冯二", phone: "13200000008", address: "陕西省西安市雁塔区小寨东路12号" },
    package: { weight_kg: NumberDecimal("0.8"), quantity: NumberInt(1), category: "服饰", remark: "" },
    current_status: "OUT_FOR_DELIVERY",
    current_node: "西安小寨营业点",
    tracking: [
      { time: T("2026-11-16T09:00:00+08:00"), node: "成都武侯营业点", action: "已揽收，快递员褚三取件", status: "PICKED_UP" },
      { time: T("2026-11-16T20:00:00+08:00"), node: "成都中转场", action: "快件离开成都中转场，发往西安", status: "IN_TRANSIT" },
      { time: T("2026-11-17T18:00:00+08:00"), node: "西安小寨营业点", action: "快件到达派送网点，安排派送", status: "OUT_FOR_DELIVERY" }
    ],
    created_at: T("2026-11-16T08:40:00+08:00"),
    updated_at: T("2026-11-17T18:00:00+08:00")
  },
  {
    order_no: "ET20261115000005",
    sender: { name: "蒋四", phone: "13100000009", address: "江苏省南京市鼓楼区中山路1号" },
    receiver: { name: "沈五", phone: "13000000010", address: "浙江省杭州市西湖区文三路100号" },
    package: { weight_kg: NumberDecimal("3.0"), quantity: NumberInt(1), category: "食品", remark: "保质期见包装" },
    current_status: "DELIVERED",
    current_node: "杭州西湖营业点",
    tracking: [
      { time: T("2026-11-15T11:00:00+08:00"), node: "南京鼓楼营业点", action: "已揽收，快递员韩六取件", status: "PICKED_UP" },
      { time: T("2026-11-15T22:00:00+08:00"), node: "南京中转场", action: "快件离开南京中转场，发往杭州", status: "IN_TRANSIT" },
      { time: T("2026-11-16T12:00:00+08:00"), node: "杭州西湖营业点", action: "快件到达派送网点，安排派送", status: "OUT_FOR_DELIVERY" },
      { time: T("2026-11-16T16:45:00+08:00"), node: "杭州西湖营业点", action: "快件已签收，签收人：本人", status: "DELIVERED" }
    ],
    created_at: T("2026-11-15T10:30:00+08:00"),
    updated_at: T("2026-11-16T16:45:00+08:00")
  }
];

let upserted = 0;
for (const doc of seed) {
  const res = db.orders.updateOne(
    { order_no: doc.order_no },
    { $setOnInsert: doc },
    { upsert: true }
  );
  if (res.upsertedCount > 0) upserted++;
}

print(`✔ 演示数据就绪：新增 ${upserted} 条，共 ${db.orders.countDocuments({})} 条订单`);
