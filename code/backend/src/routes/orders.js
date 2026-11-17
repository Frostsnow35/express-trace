// 订单路由（业务实现见 issue #4/#5/#6，此处仅挂载点）
import { Router } from "express";

const router = Router();
// POST /orders          → issue #4
// GET  /orders          → issue #5
// GET  /orders/:orderNo → issue #5
// POST /orders/:orderNo/tracking → issue #6

export default router;
