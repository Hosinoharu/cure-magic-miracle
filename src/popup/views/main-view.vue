<!-- popup page 中由多个部分组成，包括：
1. 基本的配置页
2. 常用的反调试
3. 固定时间戳等
4. 插件配置
-->

<template>
  <el-tabs type="border-card">
    <el-tab-pane>
      <template #label>
        <el-icon>
          <Ship />
        </el-icon>
        <span>Anti</span>
      </template>
      <anti-debugger />
    </el-tab-pane>
    <el-tab-pane>
      <template #label>
        <el-icon>
          <IceCream />
        </el-icon>
        <span>Freeze</span>
      </template>
      <freeze-random />
    </el-tab-pane>
    <el-tab-pane>
      <template #label>
        <el-icon>
          <Setting />
        </el-icon>
        <span>Setting</span>
      </template>
      <setting-page />
    </el-tab-pane>
    <el-tab-pane>
      <template #label>
        <el-icon>
          <Present />
        </el-icon>
        <span>Cure</span>
      </template>
      <extension-setting />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import SettingPage from "./setting-page.vue";
import AntiDebugger from "./anti-debugger.vue";
import FreezeRandom from "./freeze-random.vue";
import ExtensionSetting from "./extension-setting.vue";

import { Ship, IceCream, Setting, Present } from "@element-plus/icons-vue";
</script>

<style scoped>
.el-icon {
  margin-right: 2px;
}
</style>
