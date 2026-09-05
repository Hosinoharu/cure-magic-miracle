<!-- 优化本项目使用的 el-select，在不编辑时，显示成文本 -->

<template>
  <section @click="section_click">
    <el-text
      v-if="show_text"
      :class="{
        'fake-placeholder': placeholder && !modelValue,
        'not-allow': disabled,
        'light-not-allow': light_disabled,
      }"
      style="padding-left: 10px"
    >
      {{ get_label(modelValue) || placeholder }}
    </el-text>

    <el-select
      v-else
      ref="elem"
      :model-value="modelValue"
      :clearable="clearable"
      :placeholder="placeholder"
      v-bind="$attrs"
      @focus="!disabled && (show_text = false)"
      @blur="show_text = true"
    >
      <el-option
        v-for="item in operations"
        :key="typeof item === 'string' ? item : item.id"
        :label="typeof item === 'string' ? item : item.label"
        :value="typeof item === 'string' ? item : item.value"
      />
    </el-select>
  </section>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue: any;
  placeholder?: string;
  disabled?: boolean;
  light_disabled?: boolean;
  /** 是否可以清空选择项，默认为【可以清空】 */
  clearable?: boolean;
  operations: Array<
    | string
    | {
        id: string;
        label: string;
        value: string;
      }
  >;
}>();

function get_label(value: string) {
  if (typeof props.operations[0] === "string") return value;
  // @ts-ignore
  return props.operations.find(item => item.value === value)?.label || value;
}

const elem = ref();
/** 为 true 则显示文本 */
const show_text = ref(true);

async function section_click() {
  if (props.disabled || props.light_disabled) return;
  show_text.value = false;
  await nextTick();
  elem.value.focus();
}
</script>

<style scoped></style>
