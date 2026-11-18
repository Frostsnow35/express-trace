// 订单路由（业务实现见 issue #4/#5/#6）
import { Router } from "express";
import * as ctrl from "../controllers/orderController.js";

const router = Router();

router.post("/", ctrl.createOrder); // 3.1 创建订单（issue #4）
// GET  /orders          → issue #5
// GET  /orders/:orderNo → issue #5
// POST /orders/:orderNo/tracking → issue #6

export default router;
