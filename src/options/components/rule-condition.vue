<!-- 编辑规则的条件 -->

<template>
  <section class="condition-items">
    <condition-item title="Domain Type" :desc="desc.domain_type">
      <el-select v-model="condition.domain_type" placeholder="Select" clearable>
        <el-option
          v-for="item in domain_type_options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </condition-item>

    <condition-item
      title="Initiator Domains"
      :desc="desc.initiator_domains"
      :includes="condition.initiator_domains"
      :excludes="condition.excluded_initiator_domains"
    />

    <condition-item
      title="Request Domains"
      :desc="desc.request_domains"
      :includes="condition.request_domains"
      :excludes="condition.excluded_request_domains"
    />

    <condition-item
      title="Request Methods"
      :desc="desc.request_methods"
      :includes="condition.request_methods"
      :excludes="condition.excluded_request_methods"
    />

    <condition-item
      title="Resource Types"
      :desc="desc.resource_types"
      :includes="condition.resource_types"
      :excludes="condition.excluded_resource_types"
    />

    <!-- <condition-item
      title="Tab"
      :include_desc="desc.tabIds"
      :exclude_desc="desc.excluded_tabIds"
      :includes="condition.tabIds!"
      :excludes="condition.excluded_tabIds!"
    /> -->
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ConditionItem from "./condition-item.vue";

const props = withDefaults(
  defineProps<{
    data?: RuleCondition;
  }>(),
  {
    data: () => ({
      initiator_domains: [],
      excluded_initiator_domains: [],
      request_domains: [],
      excluded_request_domains: [],
      request_methods: [],
      excluded_request_methods: [],
      resource_types: [],
      excluded_resource_types: [],
      tabIds: [],
      excluded_tabIds: [],
    }),
  },
);

const condition = ref<RuleCondition>(props.data);

/** 各配置项的描述信息，使用 `#` 用于换行显示
 *
 * https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition
 */
const desc = Object.freeze({
  domain_type:
    "指定网络请求是其源域的第一方还是第三方请求。##- 如果省略，则接受所有请求。",

  initiator_domains:
    "规则仅匹配【源自】此域名列表的网络请求。##- 如果省略该列表，则规则适用于所有域名的请求。",

  request_domains:
    "规则仅在域名与此列表中的某个匹配时匹配网络请求。##- 如果省略该列表，则规则适用于所有域名的请求。",

  request_methods:
    "规则匹配的 HTTP 请求方法列表。##- 指定 Request Methods 规则条件还会排除非 HTTP(s) 请求。##- 只能指定 inlucde 和 exclude 中的一个， 如果两者都未指定，则匹配所有请求方法。",

  resource_types: `规则匹配的资源类型列表。##- 只能指定 inlucde 和 exclude 中的一个。##- 如果两者都未指定，则阻止除 "main_frame" 之外的所有资源类型`,

  tabIds: `规则匹配的标签页 ID 列表。仅支持会话范围的规则。`,
});

const domain_type_options: Array<{
  value: NonNullable<RuleCondition["domain_type"]>;
  label: string;
}> = [
  { value: "firstParty", label: "First Party" },
  { value: "thirdParty", label: "Third Party" },
];
</script>

<style scoped>
.condition-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
