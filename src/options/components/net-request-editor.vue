<!-- 编辑一个 Net Request Item 的 UI -->

<template>
  <section class="net-request-editor">
    <el-tabs v-model="current_tab" type="card">
      <el-tab-pane label="Condition" name="condition">
        <rule-condition :data="data.condition" />
      </el-tab-pane>

      <el-tab-pane
        label="Request Header"
        name="req-http-header"
        :disabled="!is_header_tab_enable"
      >
        <http-header-config type="Request" :headers="data.req_headers" />
      </el-tab-pane>

      <el-tab-pane
        label="Response Header"
        name="res-http-header"
        :disabled="!is_header_tab_enable"
      >
        <http-header-config type="Response" :headers="data.res_headers" />
      </el-tab-pane>

      <el-tab-pane
        label="Redirect"
        name="redirect"
        :disabled="open_tab !== 'redirect'"
      >
        redirect
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import HttpHeaderConfig from "./http-header-config.vue";
import ruleCondition from "./rule-condition.vue";

type Props = {
  open_tab: NetRequestEditorTabKey;
  data: RuleActionData;
};

const props = defineProps<Props>();

const is_header_tab_enable =
  props.open_tab === "req-http-header" || props.open_tab === "res-http-header";

// ====================================================

const current_tab = ref<Props["open_tab"]>(props.open_tab);
</script>
