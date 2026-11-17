<template>
  <header class="topbar">
    <div class="brand">驿迹 ExpressTrace</div>
    <nav>
      <RouterLink to="/">工作台</RouterLink>
      <RouterLink to="/orders">订单</RouterLink>
      <RouterLink to="/bags">集包袋</RouterLink>
      <RouterLink to="/track">公开查单</RouterLink>
    </nav>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 32px;
  background: #24292f;
  color: #fff;
  padding: 0 24px;
  height: 52px;
}
.brand { font-weight: 700; font-size: 16px; }
nav { display: flex; gap: 4px; }
nav a {
  padding: 6px 14px;
  border-radius: 6px;
  color: #c9d1d9;
}
nav a.router-link-active { background: #1a7f37; color: #fff; }
.page { max-width: 1080px; margin: 24px auto; padding: 0 16px; }
</style>
