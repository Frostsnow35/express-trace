// 路由（document/03 §5 映射表）
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", name: "dashboard", component: () => import("../views/Dashboard.vue") },
  { path: "/orders", name: "orders", component: () => import("../views/OrderList.vue") },
  { path: "/orders/new", name: "order-new", component: () => import("../views/OrderNew.vue") },
  { path: "/orders/:orderNo", name: "order-detail", component: () => import("../views/OrderDetail.vue") },
  { path: "/track", name: "track", component: () => import("../views/Track.vue") },
  { path: "/bags", name: "bags", component: () => import("../views/BagList.vue") },
  { path: "/bags/:bagNo", name: "bag-detail", component: () => import("../views/BagDetail.vue") }
];

export default createRouter({ history: createWebHistory(), routes });
