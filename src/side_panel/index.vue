<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <el-tabs v-model="active_tab">
    <el-tab-pane label="Cookie" name="cookie">
      <cookie-editor />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import CookieEditor from "./view/cookie-editor.vue";
import { ref } from "vue";
const active_tab = ref("cookie");
</script>

<style scoped>
.el-tabs {
  padding: 0 20px 20px 10px;
}
</style>
