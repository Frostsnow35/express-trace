<template>
  <div>
    <div class="card">
      <h2>建袋</h2>
      <div class="form-row">
        <input v-model.trim="destNode" placeholder="目的分拨（如：长沙中转场）" @keyup.enter="create" />
        <button class="primary" :disabled="!destNode || loading" @click="create">建袋</button>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>

    <div class="card">
      <h2>袋列表</h2>
      <div class="form-row">
        <select v-model="statusFilter">
          <option value="">全部状态</option>
          <option v-for="s in BAG_STATUS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <button @click="load">刷新</button>
      </div>
      <table>
        <thead>
          <tr><th>袋号</th><th>目的分拨</th><th>状态</th><th>件数</th><th>建袋时间</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="b in items" :key="b.bag_no">
            <td>{{ b.bag_no }}</td>
            <td>{{ b.dest_node }}</td>
            <td><span class="badge" :style="{ background: meta(BAG_STATUS, b.status).color }">{{ meta(BAG_STATUS, b.status).label }}</span></td>
            <td>{{ b.order_nos.length }}</td>
            <td>{{ fmt(b.created_at) }}</td>
            <td><RouterLink :to="`/bags/${b.bag_no}`">详情</RouterLink></td>
          </tr>
          <tr v-if="!items.length"><td colspan="6" class="muted">暂无数据</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { bagsApi } from "../api/bags.js";
import { BAG_STATUS, statusMeta as meta } from "../constants/status.js";

const destNode = ref("");
const statusFilter = ref("");
const items = ref([]);
const loading = ref(false);
const error = ref("");

const fmt = (d) => new Date(d).toLocaleString("zh-CN", { hour12: false });

async function load() {
  error.value = "";
  try {
    const data = await bagsApi.list({ status: statusFilter.value || undefined });
    items.value = data.items;
  } catch (e) {
    error.value = e.message;
  }
}

async function create() {
  loading.value = true;
  error.value = "";
  try {
    await bagsApi.create(destNode.value);
    destNode.value = "";
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

watch(statusFilter, load);
onMounted(load);
</script>

<style scoped>
.form-row { display: flex; gap: 8px; margin: 8px 0 16px; }
.form-row input { flex: 1; }
.badge { color: #fff; border-radius: 10px; padding: 2px 10px; font-size: 12px; }
a { color: #0969da; }
</style>
