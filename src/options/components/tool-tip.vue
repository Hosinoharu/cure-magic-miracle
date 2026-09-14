<!-- 简单封装 el-tooltip，因为一些重复的太多了
 字符串中传入 `#` 可以换行显示 -->

<template>
  <el-tooltip
    effect="light"
    placement="top-start"
    style="color: red"
    :disabled="disabled"
    :hide-after="0"
    :enterable="false"
  >
    <template #content>
      <p v-for="(line, index) in lines" :key="index">
        <span v-if="line">{{ line }}</span>
        <br v-else />
      </p>
    </template>
    <slot></slot>
  </el-tooltip>
</template>

<script setup lang="ts">
const props = defineProps<{
  content: string;
  disabled?: boolean;
}>();

const lines = props.content.split("#");
</script>
