<!-- 配置随机性的配置项 -->

<template>
  <setting-view :setting="default_freeze_setting" target="Hook" />
</template>

<script setup lang="ts">
import SettingView from "../components/setting-viewer.vue";
import { default_freeze_setting } from "../share/setting_info";
</script>
