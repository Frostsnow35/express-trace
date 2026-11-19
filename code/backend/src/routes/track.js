// 公开查单路由（FR-06）
import { Router } from "express";
import * as ctrl from "../controllers/trackController.js";

const router = Router();
router.get("/:orderNo", ctrl.getTrack);

export default router;
