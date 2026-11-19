// 状态统计路由（FR-05）
import { Router } from "express";
import * as ctrl from "../controllers/statsController.js";

const router = Router();
router.get("/status-count", ctrl.getStatusCount);

export default router;
