<!-- 编辑 Rule Condition 时，展示一个配置项 -->

<template>
  <section class="condition-item">
    <section class="header">
      <section class="header-left">
        <tool-tip :content="desc">
          <el-icon><QuestionFilled /></el-icon>
        </tool-tip>
        <el-text>{{ title }}</el-text>
      </section>
      <section class="header-right">
        <el-segmented v-model="tab" :options="options" size="small" />
      </section>
    </section>

    <section v-if="!includes && !excludes">
      <slot></slot>
    </section>
    <section v-else>
      <condition-multi-value v-if="tab === 'include'" :values="includes!" />
      <condition-multi-value v-else :values="excludes!" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { QuestionFilled } from "@element-plus/icons-vue";
import ToolTip from "./tool-tip.vue";
import ConditionMultiValue from "./condition-multi-value.vue";

/** 当前配置项有 3 种
 *
 * - domain types，属于 select，但没有 exclude
 * - 其它，属于 input，且具备 exclude
 * - `tabIds`，特殊，属于 select，且具备 exclude
 */
defineProps<{
  title: string;
  desc: string;
  includes?: string[];
  excludes?: string[];
}>();

const tab = ref<"include" | "exclude">("include");
const options = ["include", "exclude"];
</script>

<style scoped>
.condition-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 5px;

  > section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .header {
    padding: 0 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  }
}
</style>
