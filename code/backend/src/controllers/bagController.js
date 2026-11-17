// 袋控制器：参数解析 + 响应封装，业务校验在 service（07 §3）
import { ok } from "../core/response.js";
import * as bagService from "../services/bagService.js";

export async function createBag(req, res, next) {
  try {
    const bag = await bagService.createBag(req.body ?? {});
    ok(res, bag, 201);
  } catch (e) {
    next(e);
  }
}

export async function listBags(req, res, next) {
  try {
    ok(res, await bagService.listBags(req.query ?? {}));
  } catch (e) {
    next(e);
  }
}

export async function getBag(req, res, next) {
  try {
    ok(res, await bagService.getBag(req.params.bagNo));
  } catch (e) {
    next(e);
  }
}

export async function addItem(req, res, next) {
  try {
    const bag = await bagService.addItem(req.params.bagNo, req.body?.order_no);
    ok(res, bag);
  } catch (e) {
    next(e);
  }
}

export async function scanBag(req, res, next) {
  try {
    const result = await bagService.scanBag(req.params.bagNo, req.body ?? {});
    ok(res, result); // { bag, propagated_count }（03 §3.9）
  } catch (e) {
    next(e);
  }
}

export async function markException(req, res, next) {
  try {
    const bag = await bagService.markException(req.params.bagNo, req.body ?? {});
    ok(res, bag);
  } catch (e) {
    next(e);
  }
}

export async function impact(req, res, next) {
  try {
    ok(res, await bagService.impact(req.params.bagNo));
  } catch (e) {
    next(e);
  }
}
