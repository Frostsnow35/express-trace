// 03-seed-data.js — 演示数据（幂等：订单按 order_no upsert，袋按 bag_no upsert）
// 用法: mongosh mongodb://127.0.0.1:27017 data/init/03-seed-data.js
// 覆盖 5 种订单状态各至少 1 单 + 演示袋 2 个（1 正常在途 + 1 破损异常，供 FR-10 影响面演示）

db = db.getSiblingDB("express_trace");

const T = (s) => new Date(s);

const seedOrders = [
  {
    order_no: "ET20261117000001",
    sender: { name: "张三", phone: "13800000001", address: "广东省深圳市南山区科技园路1号" },
    receiver: { name: "李四", phone: "13900000002", address: "北京市海淀区中关村大街2号" },
    package: { weight_kg: 2.5, quantity: 1, category: "日用品", remark: "易碎，轻拿轻放" },
    current_status: "CREATED",
    current_node: "深圳南山营业点",
    bag_no: null,
    tracking: [],
    created_at: T("2026-11-17T08:58:00+08:00"),
    updated_at: T("2026-11-17T08:58:00+08:00")
  },
  {
    order_no: "ET20261117000002",
    sender: { name: "王五", phone: "13700000003", address: "广东省广州市天河区体育西路10号" },
    receiver: { name: "赵六", phone: "13600000004", address: "上海市浦东新区世纪大道100号" },
    package: { weight_kg: 1.0, quantity: 2, category: "文件", remark: "" },
    current_status: "PICKED_UP",
    current_node: "广州天河营业点",
    bag_no: "BG202611170001",
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
    package: { weight_kg: 5.2, quantity: 1, category: "电子产品", remark: "含电池" },
    current_status: "IN_TRANSIT",
    current_node: "武汉中转场",
    bag_no: null,
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
    package: { weight_kg: 0.8, quantity: 1, category: "服饰", remark: "" },
    current_status: "OUT_FOR_DELIVERY",
    current_node: "西安小寨营业点",
    bag_no: null,
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
    package: { weight_kg: 3.0, quantity: 1, category: "食品", remark: "保质期见包装" },
    current_status: "DELIVERED",
    current_node: "杭州西湖营业点",
    bag_no: null,
    tracking: [
      { time: T("2026-11-15T11:00:00+08:00"), node: "南京鼓楼营业点", action: "已揽收，快递员韩六取件", status: "PICKED_UP" },
      { time: T("2026-11-15T22:00:00+08:00"), node: "南京中转场", action: "快件离开南京中转场，发往杭州", status: "IN_TRANSIT" },
      { time: T("2026-11-16T12:00:00+08:00"), node: "杭州西湖营业点", action: "快件到达派送网点，安排派送", status: "OUT_FOR_DELIVERY" },
      { time: T("2026-11-16T16:45:00+08:00"), node: "杭州西湖营业点", action: "快件已签收，签收人：本人", status: "DELIVERED" }
    ],
    created_at: T("2026-11-15T10:30:00+08:00"),
    updated_at: T("2026-11-16T16:45:00+08:00")
  },
  // ---- 以下 3 单为集包袋演示成员（FR-08~10）----
  {
    order_no: "ET20261117000006",
    sender: { name: "钱七", phone: "13900000011", address: "广东省广州市越秀区东风中路100号" },
    receiver: { name: "吴八", phone: "13800000012", address: "湖北省武汉市洪山区珞喻路88号" },
    package: { weight_kg: 1.2, quantity: 1, category: "文件", remark: "" },
    current_status: "PICKED_UP",
    current_node: "广州天河营业点",
    bag_no: "BG202611170001",
    tracking: [
      { time: T("2026-11-17T11:00:00+08:00"), node: "广州天河营业点", action: "已揽收，快递员陈七取件", status: "PICKED_UP" }
    ],
    created_at: T("2026-11-17T10:30:00+08:00"),
    updated_at: T("2026-11-17T11:00:00+08:00")
  },
  {
    order_no: "ET20261117000007",
    sender: { name: "郑九", phone: "13700000013", address: "四川省成都市锦江区红星路三段1号" },
    receiver: { name: "王十", phone: "13600000014", address: "陕西省西安市碑林区长安北路20号" },
    package: { weight_kg: 2.0, quantity: 1, category: "日用品", remark: "" },
    current_status: "PICKED_UP",
    current_node: "成都武侯营业点",
    bag_no: "BG202611160002",
    tracking: [
      { time: T("2026-11-16T15:00:00+08:00"), node: "成都武侯营业点", action: "已揽收，快递员褚三取件", status: "PICKED_UP" }
    ],
    created_at: T("2026-11-16T14:30:00+08:00"),
    updated_at: T("2026-11-16T15:00:00+08:00")
  },
  {
    order_no: "ET20261117000008",
    sender: { name: "冯一", phone: "13500000015", address: "四川省成都市青羊区顺城大街30号" },
    receiver: { name: "陈二", phone: "13400000016", address: "陕西省西安市雁塔区科技路5号" },
    package: { weight_kg: 0.5, quantity: 3, category: "文具", remark: "" },
    current_status: "PICKED_UP",
    current_node: "成都武侯营业点",
    bag_no: "BG202611160002",
    tracking: [
      { time: T("2026-11-16T15:20:00+08:00"), node: "成都武侯营业点", action: "已揽收，快递员褚三取件", status: "PICKED_UP" }
    ],
    created_at: T("2026-11-16T14:50:00+08:00"),
    updated_at: T("2026-11-16T15:20:00+08:00")
  }
];

const seedBags = [
  {
    bag_no: "BG202611170001",
    dest_node: "武汉中转场",
    status: "IN_TRANSIT",
    order_nos: ["ET20261117000002", "ET20261117000006"],
    scans: [
      { time: T("2026-11-17T21:00:00+08:00"), node: "广州天河分拨", action: "封袋，总牌标注武汉中转场", type: "SEAL" },
      { time: T("2026-11-17T21:30:00+08:00"), node: "广州天河分拨", action: "整袋发运，干线车辆粤A-12345", type: "DEPART" }
    ],
    created_at: T("2026-11-17T20:30:00+08:00"),
    updated_at: T("2026-11-17T21:30:00+08:00")
  },
  {
    bag_no: "BG202611160002",
    dest_node: "西安中转场",
    status: "BROKEN",
    order_nos: ["ET20261117000007", "ET20261117000008"],
    scans: [
      { time: T("2026-11-16T19:00:00+08:00"), node: "成都武侯分拨", action: "封袋，总牌标注西安中转场", type: "SEAL" },
      { time: T("2026-11-16T19:30:00+08:00"), node: "成都武侯分拨", action: "整袋发运，干线车辆川A-67890", type: "DEPART" },
      { time: T("2026-11-17T08:00:00+08:00"), node: "西安中转场", action: "集包袋破损，袋内小件散落分拨中心，待人工翻找", type: "EXCEPTION" }
    ],
    created_at: T("2026-11-16T18:30:00+08:00"),
    updated_at: T("2026-11-17T08:00:00+08:00")
  }
];

let oNew = 0, bNew = 0;
for (const doc of seedOrders) {
  const res = db.orders.updateOne({ order_no: doc.order_no }, { $setOnInsert: doc }, { upsert: true });
  if (res.upsertedCount > 0) oNew++;
}
for (const doc of seedBags) {
  const res = db.bags.updateOne({ bag_no: doc.bag_no }, { $setOnInsert: doc }, { upsert: true });
  if (res.upsertedCount > 0) bNew++;
}

print(`✔ 演示数据就绪：订单新增 ${oNew} 条（共 ${db.orders.countDocuments({})} 条），袋新增 ${bNew} 个（共 ${db.bags.countDocuments({})} 个）`);
