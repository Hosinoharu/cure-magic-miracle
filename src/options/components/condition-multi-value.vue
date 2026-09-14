<!-- 在编辑 Rule Condition 时，部分配置项可以添加多个值，用这个组件展示 -->

<template>
  <section class="multi-value">
    <el-input
      ref="input_ref"
      v-model.trim="current_input"
      placeholder="Input"
      @keyup.enter="add_line"
      clearable
    >
      <template #prepend>
        <el-button :icon="Plus" @click="add_line"></el-button>
      </template>
    </el-input>

    <section class="added-lines">
      <section class="line" v-for="(line, index) in current_lines" :key="index">
        <section class="line-left">
          <el-button text :icon="EditPen" @click="edit_line(index)"></el-button>
          <span style="margin-left: 10px">{{ line }}</span>
        </section>
        <el-button
          text
          type="danger"
          :icon="Close"
          @click="delete_line(index)"
        ></el-button>
      </section>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Close, EditPen, Plus } from "@element-plus/icons-vue";
import type { InputInstance } from "element-plus";
import { computed, ref } from "vue";

const props = defineProps<{
  values: string[];
}>();

const emit = defineEmits<{
  (e: "update:values", value: string[]): void;
}>();

const current_lines = computed({
  get: () => props.values,
  set: value => emit("update:values", value),
});

const input_ref = ref<InputInstance>();
const current_input = ref<string>("");

function add_line() {
  current_lines.value.push(current_input.value);
  current_input.value = "";
}

function edit_line(index: number) {
  current_input.value = current_lines.value[index] || "";
  delete_line(index);
  input_ref.value?.focus();
}

function delete_line(index: number) {
  current_lines.value.splice(index, 1);
}
</script>

<style scoped>
.multi-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;

  .added-lines {
    width: 100%;

    .line {
      display: flex;
      justify-content: space-between;
      align-items: center;

      background-color: #333;
      border-radius: 5px;
      padding: 0 20px;
      margin-bottom: 5px;
      border-bottom: 1px solid var(--el-border-color);
    }
  }
}
</style>
