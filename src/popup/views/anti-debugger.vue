<!-- 反调试的配置项 -->

<template>
  <setting-view :setting="default_ani_debugger_setting" target="Hook" />
</template>

<script setup lang="ts">
import SettingView from "../components/setting-viewer.vue";
import { default_ani_debugger_setting } from "../share/setting_info";
</script>
