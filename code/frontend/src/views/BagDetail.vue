<template>
  <div v-if="bag">
    <div class="card">
      <h2>袋 {{ bag.bag_no }}
        <span class="badge" :style="{ background: meta(BAG_STATUS, bag.status).color }">{{ meta(BAG_STATUS, bag.status).label }}</span>
      </h2>
      <p class="muted">目的分拨：{{ bag.dest_node }} ｜ 装载 {{ bag.order_nos.length }} 件 ｜ 建袋 {{ fmt(bag.created_at) }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="notice" class="notice">{{ notice }}</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>袋级扫描</h3>
        <div v-if="legalTypes.length" class="form-col">
          <select v-model="scan.type">
            <option v-for="t in legalTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <input type="datetime-local" v-model="scan.time" step="1" />
          <input v-model.trim="scan.node" placeholder="所在网点" />
          <input v-model.trim="scan.action" placeholder="操作说明" @keyup.enter="doScan" />
          <button class="primary" :disabled="!scanReady" @click="doScan">提交扫描</button>
        </div>
        <p v-else class="muted">当前状态（{{ meta(BAG_STATUS, bag.status).label }}）无合法扫描动作</p>

        <h3 style="margin-top:16px">异常标记（吸收态）</h3>
        <div class="form-row">
          <button :disabled="exceptionClosed" @click="markEx('BROKEN')">标记破损</button>
          <button :disabled="exceptionClosed" @click="markEx('LOST')">标记丢失</button>
        </div>
      </div>

      <div class="card">
        <h3>装件（{{ bag.order_nos.length }} 件）</h3>
        <div class="form-row">
          <input v-model.trim="orderNo" placeholder="订单编号 ET..." :disabled="bag.status !== 'OPEN'" @keyup.enter="doAddItem" />
          <button class="primary" :disabled="bag.status !== 'OPEN' || !orderNo" @click="doAddItem">装件</button>
        </div>
        <ul class="order-list">
          <li v-for="o in bag.order_nos" :key="o">
            <RouterLink :to="`/orders/${o}`">{{ o }}</RouterLink>
            <span v-if="bag.status === 'OPENED'" class="muted">（已解籍）</span>
          </li>
          <li v-if="!bag.order_nos.length" class="muted">暂无件</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <h3>扫描时间线</h3>
      <div class="timeline">
        <div v-for="(s, i) in bag.scans" :key="i" class="tl-item">
          <div class="tl-dot" />
          <div>
            <div class="tl-head">{{ fmt(s.time) }} · {{ s.node }}
              <span class="tag">{{ scanLabel(s.type) }}</span>
            </div>
            <div class="muted">{{ s.action }}</div>
          </div>
        </div>
        <p v-if="!bag.scans.length" class="muted">暂无扫描记录</p>
      </div>
    </div>

    <div class="card">
      <h3>影响面分析
        <button style="float:right" @click="loadImpact">刷新</button>
      </h3>
      <p v-if="impactData">
        受影响件数：<b>{{ impactData.affected_count }}</b> ｜ 状态分布：
        <span v-for="(v, k) in impactData.status_dist" :key="k" class="tag">{{ meta(ORDER_STATUS, k).label }} {{ v }}</span>
      </p>
      <table v-if="impactData">
        <thead>
          <tr><th>订单号</th><th>状态</th><th>当前网点</th><th>收件人</th><th>电话</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in impactData.orders" :key="o.order_no">
            <td><RouterLink :to="`/orders/${o.order_no}`">{{ o.order_no }}</RouterLink></td>
            <td><span class="badge" :style="{ background: meta(ORDER_STATUS, o.current_status).color }">{{ meta(ORDER_STATUS, o.current_status).label }}</span></td>
            <td>{{ o.current_node }}</td>
            <td>{{ o.receiver_name }}</td>
            <td>{{ o.receiver_phone }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="card"><p class="muted">加载中…</p></div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { bagsApi } from "../api/bags.js";
import {
  BAG_STATUS, ORDER_STATUS, BAG_SCAN_TYPES, BAG_TRANSITIONS,
  ERROR_TEXT, statusMeta as meta
} from "../constants/status.js";

const route = useRoute();
const bag = ref(null);
const impactData = ref(null);
const error = ref("");
const notice = ref("");
const orderNo = ref("");
const scan = ref({ type: "", time: "", node: "", action: "" });

const fmt = (d) => new Date(d).toLocaleString("zh-CN", { hour12: false });
const scanLabel = (t) => BAG_SCAN_TYPES.find((s) => s.value === t)?.label ?? t;

// 按袋状态预过滤合法扫描动作（BR-07 前端镜像，后端仍强校验）
const legalTypes = computed(() =>
  BAG_SCAN_TYPES.filter((t) => BAG_TRANSITIONS[t.value]?.from.includes(bag.value?.status))
);
const exceptionClosed = computed(() =>
  ["OPENED", "BROKEN", "LOST"].includes(bag.value?.status)
);
const scanReady = computed(() =>
  scan.value.type && scan.value.time && scan.value.node && scan.value.action
);

watch(legalTypes, (list) => {
  if (list.length && !list.some((t) => t.value === scan.value.type)) {
    scan.value.type = list[0].value;
  }
});

function fail(e) {
  error.value = ERROR_TEXT[e.code] ?? e.message;
}

async function refresh() {
  bag.value = await bagsApi.detail(route.params.bagNo);
}

async function doAddItem() {
  error.value = ""; notice.value = "";
  try {
    await bagsApi.addItem(route.params.bagNo, orderNo.value);
    orderNo.value = "";
    notice.value = "装件成功";
    await refresh();
  } catch (e) { fail(e); }
}

async function doScan() {
  error.value = ""; notice.value = "";
  try {
    const r = await bagsApi.scan(route.params.bagNo, {
      ...scan.value,
      time: new Date(scan.value.time).toISOString()
    });
    notice.value = `扫描成功，已同步 ${r.propagated_count} 件轨迹`;
    scan.value.action = "";
    await refresh();
  } catch (e) { fail(e); }
}

async function markEx(type) {
  error.value = ""; notice.value = "";
  try {
    await bagsApi.markException(route.params.bagNo, {
      type,
      action: type === "BROKEN" ? "集包袋破损，袋内小件散落" : "集包袋丢失"
    });
    notice.value = `已标记${type === "BROKEN" ? "破损" : "丢失"}`;
    await refresh();
  } catch (e) { fail(e); }
}

async function loadImpact() {
  error.value = "";
  try {
    impactData.value = await bagsApi.impact(route.params.bagNo);
  } catch (e) { fail(e); }
}

onMounted(async () => {
  try {
    await refresh();
    await loadImpact();
  } catch (e) { fail(e); }
});
</script>

<style scoped>
.badge { color: #fff; border-radius: 10px; padding: 2px 10px; font-size: 12px; margin-left: 8px; vertical-align: middle; }
.tag { background: #ddf4ff; color: #0969da; border-radius: 10px; padding: 1px 8px; font-size: 12px; margin-left: 6px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-col { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
.form-row { display: flex; gap: 8px; margin: 8px 0; }
.form-row input { flex: 1; }
.notice { color: #1a7f37; margin-top: 8px; }
.order-list { list-style: none; margin-top: 8px; }
.order-list li { padding: 4px 0; border-bottom: 1px dashed #d8dee4; }
a { color: #0969da; }
.timeline { margin-top: 8px; }
.tl-item { display: flex; gap: 12px; padding: 8px 0; border-left: 2px solid #d8dee4; margin-left: 6px; padding-left: 16px; position: relative; }
.tl-dot { width: 8px; height: 8px; border-radius: 50%; background: #1a7f37; position: absolute; left: -5px; top: 14px; }
.tl-head { font-weight: 600; }
</style>
