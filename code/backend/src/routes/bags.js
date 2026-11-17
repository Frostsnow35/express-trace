// 集包袋路由（业务实现见袋接口 issue，此处仅挂载点）
import { Router } from "express";

const router = Router();
// POST /bags                    → 建袋
// POST /bags/:bagNo/items       → 装件
// POST /bags/:bagNo/scan        → 袋扫件动
// POST /bags/:bagNo/exception   → 异常标记
// GET  /bags/:bagNo/impact      → 影响面分析

export default router;
