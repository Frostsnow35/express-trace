// 集包袋路由（document/03 §3.7~3.11）
import { Router } from "express";
import * as ctrl from "../controllers/bagController.js";

const router = Router();

router.post("/", ctrl.createBag); // 3.7 建袋
router.get("/", ctrl.listBags); // 3.12 袋列表
router.get("/:bagNo", ctrl.getBag); // 3.13 袋详情（含 scans）
router.post("/:bagNo/items", ctrl.addItem); // 3.8 装件
router.post("/:bagNo/scan", ctrl.scanBag); // 3.9 袋扫件动
router.post("/:bagNo/exception", ctrl.markException); // 3.10 标记异常
router.get("/:bagNo/impact", ctrl.impact); // 3.11 影响面分析

export default router;
