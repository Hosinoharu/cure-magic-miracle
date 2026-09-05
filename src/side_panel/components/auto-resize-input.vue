<!--
封装 el-input（textarea），在 focus 时展示所有内容，失去焦点时显示为一行。
同时，不编辑的时候，显示成一个普通文本
-->

<template>
  <section class="auto-resize-input" @click="section_click">
    <!-- 伪装成 textarea 咯 -->
    <el-text
      v-if="show_text"
      style="word-break: break-all"
      :style="text_style"
      :class="{
        // 展示文本的时候是否自动调整大小
        'single-line-text': !autoresize,
        'fake-placeholder': placeholder && !modelValue,
        'not-allow': disabled,
        'light-not-allow': light_disabled,
      }"
    >
      {{ modelValue || placeholder }}
    </el-text>
    <!--
        使用 v-bind 将传递的其余参数给 el-input 自身
        编辑的时候必须自动调整大小！！！！！！！ 
        -->
    <el-input
      v-else
      ref="elem"
      :type="input_type"
      resize="none"
      :rows="1"
      :disabled="disabled"
      :clearable="input_type != 'textarea'"
      autosize
      :placeholder="placeholder"
      :model-value="modelValue"
      @focus="show_text = false"
      @blur="show_text = true"
      spellcheck="false"
      v-bind="$attrs"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
const props = defineProps<{
  modelValue: string | number;
  /** 是否自动调整大小 */
  autoresize?: boolean;
  /** 提示输入的占位符 */
  placeholder?: string;
  /** 是否约束输入的内容为数字 */
  number?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否禁用，但显示为灰色 */
  light_disabled?: boolean;
  /** 显示文本内容时，所用到的样式 */
  text_style?: string;
}>();

const elem = ref();
/** 为 true 则显示文本，否则显示输入框 */
const show_text = ref(true);
/** 确认 el-input 的类型 */
const input_type = computed(() => {
  if (props.number) return "number";
  if (props.autoresize) return "textarea";
  return "text";
});

/** 当整个 section click 时 */
async function section_click() {
  if (props.disabled || props.light_disabled) return;
  show_text.value = false;
  await nextTick();
  elem.value.focus();
}
</script>

<style>
.auto-resize-input .el-textarea__inner {
  overflow-y: hidden;
}
</style>

<style scoped>
/* 用于优化时的 el-text 组件，它充当展示为显示内容 */
.single-line-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
