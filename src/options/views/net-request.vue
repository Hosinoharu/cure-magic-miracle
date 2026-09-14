<template>
  <section class="lists-panel">
    <el-table ref="table_ref" :data="current_rules" border row-key="settingId">
      <!-- Rule Priority -->
      <el-table-column
        prop="priority"
        label="Priority"
        width="100"
        :resizable="false"
      >
        <template #default="{ row }">
          <fake-component>
            <template #fake>
              <el-text class="fake-elem-text" style="text-align: center">
                {{ row.priority }}
              </el-text>
            </template>
            <template #real>
              <el-input-number
                v-model.lazy="row.priority"
                :min="1"
                size="small"
                value-on-clear="min"
                controls-position="right"
                align="left"
                :precision="0"
              />
            </template>
          </fake-component>
        </template>
      </el-table-column>

      <!-- Rule On/Off -->
      <!-- @vue-generic {BaseRuleData} -->
      <el-table-column prop="on" label="On" width="50" :resizable="false">
        <template #default="{ row }">
          <checkButton v-model="row.on" @click="switch_rule_on(row)" />
        </template>
      </el-table-column>

      <!-- Rule Action -->
      <!-- @vue-generic {BaseRuleData} -->
      <el-table-column
        prop="action"
        label="Action"
        width="170"
        :resizable="false"
      >
        <template #default="{ row }">
          <fake-component>
            <template #fake>
              <el-text class="fake-elem-text">
                {{ rule_action_desc[row.action] }}
              </el-text>
            </template>
            <template #real>
              <el-select v-model="row.action" size="small">
                <el-option
                  v-for="item in rule_action_options"
                  :key="item.id"
                  :label="item.label"
                  :value="item.id"
                />
              </el-select>
            </template>
          </fake-component>
        </template>
      </el-table-column>

      <!-- Rule Group -->
      <el-table-column
        prop="group"
        label="Group"
        width="100"
        :filters="rule_group_options"
        :filter-method="rule_groups_filter"
        :resizable="false"
      >
        <template #default="{ row }">
          <fake-component>
            <template #fake>
              <el-tag
                type="info"
                size="small"
                :disable-transitions="true"
                class="fake-elem-text"
              >
                {{ row.group }}
              </el-tag>
            </template>
            <template #real>
              <el-select v-model="row.group" size="small">
                <el-option
                  v-for="item in rule_group_options"
                  :key="item.value"
                  :label="item.text"
                  :value="item.value"
                />
              </el-select>
            </template>
          </fake-component>
        </template>
      </el-table-column>

      <!-- Rule Description -->
      <el-table-column prop="desc" label="Description">
        <template #default="{ row }">
          <fake-component>
            <template #fake>
              <el-text class="fake-elem-text" style="text-align: left">
                {{ row.desc || "-" }}
              </el-text>
            </template>
            <template #real>
              <el-input
                v-model.lazy.trim="row.desc"
                clearable
                size="small"
                placeholder="＞︿＜"
              />
            </template>
          </fake-component>
        </template>
      </el-table-column>

      <!-- Rule Pattern -->
      <el-table-column prop="pattern" label="Rule" :resizable="false">
        <template #default="{ row }">
          <fake-component>
            <template #fake>
              <el-text class="fake-elem-text" style="text-align: left">
                {{ row.pattern || "-" }}
              </el-text>
            </template>
            <template #real>
              <el-input
                v-model.lazy.trim="row.pattern"
                clearable
                size="small"
                placeholder="＞︿＜ Regex Pattern"
              />
            </template>
          </fake-component>
        </template>
      </el-table-column>

      <!-- @vue-generic {BaseRuleData} -->
      <el-table-column label="Operation" width="160" :resizable="false">
        <template #default="{ row }">
          <el-button-group size="small">
            <el-button
              text
              bg
              type="primary"
              :icon="Finished"
              @click="save_rule(row)"
            ></el-button>
            <el-button
              text
              bg
              type="primary"
              :icon="CopyDocument"
              @click="copy_rule(row)"
            ></el-button>
            <el-button
              text
              bg
              type="primary"
              :icon="Edit"
              @click="open_rule_editor(row)"
            ></el-button>
            <el-popconfirm title="really?" @confirm="delete_rule(row)">
              <template #reference>
                <el-button text bg type="danger" :icon="Delete"></el-button>
              </template>
            </el-popconfirm>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <bottom-config>
    <!-- one row -->
    <template #one-row-one-key>Search Rule</template>
    <template #one-row-one-value>
      <el-input
        v-model.trim="search_input"
        placeholder="Search by rule's description"
        :prefix-icon="Search"
        clearable
        @input="is_searched = false"
        @clear="update_current_rules_with_search"
        @keyup.enter="update_current_rules_with_search"
      >
        <template #append>
          <el-button
            :icon="Position"
            @click="update_current_rules_with_search"
          ></el-button>
        </template>
      </el-input>
    </template>

    <template #one-row-two-key>Rule Mode</template>
    <template #one-row-two-value>
      <el-text
        class="rpc-mode-text"
        :style="{
          color:
            current_rule_mode === 'dynamic'
              ? 'var(--cure-zukyoon)'
              : 'var(--cure-kyun)',
        }"
      >
        {{ current_rule_mode }}
      </el-text>
    </template>

    <template #one-row-end-btn>
      <el-button
        text
        bg
        type="warning"
        :icon="Switch"
        @click="switch_rule_mode"
      >
        Switch Mode
      </el-button>
    </template>

    <!-- two row -->
    <template #two-row-one-key>Operation</template>
    <template #two-row-one-value>
      <el-popconfirm
        title="really?"
        @confirm="delete_listed_ruels"
        placement="top"
      >
        <template #reference>
          <el-button
            text
            type="danger"
            :icon="Delete"
            size="small"
            :disabled="!is_searched"
          >
            Delete Listed Ruels
          </el-button>
        </template>
      </el-popconfirm>

      <el-popconfirm
        title="really?"
        @confirm="delete_all_ruels"
        placement="top"
      >
        <template #reference>
          <el-button text type="danger" :icon="Delete" size="small">
            Delete All
          </el-button>
        </template>
      </el-popconfirm>
    </template>

    <template #two-row-two-key>Listed Rules</template>
    <template #two-row-two-value>{{ current_rules.length }}</template>

    <template #two-row-end-btn>
      <el-button text bg type="primary" :icon="Plus" @click="add_empty_rule">
        Add Empty Rule
      </el-button>
    </template>
  </bottom-config>

  <el-drawer
    v-model="rule_editor_visiable"
    :title="rule_editor_title"
    destroy-on-close
    @close="close_rule_editor"
    size="80%"
  >
    <net-request-editor :open_tab="rule_editor_tab" :data="rule_editor_data" />
  </el-drawer>
</template>

<script setup lang="ts">
import BottomConfig from "../components/bottom-config.vue";
import fakeComponent from "../components/fake-component.vue";
import { ref, onMounted, toRaw } from "vue";
import use_net_request_manager from "../hooks/net-request.ts";
import checkButton from "../components/check-button.vue";
import {
  CopyDocument,
  Delete,
  Edit,
  Finished,
  Plus,
  Position,
  Search,
  Switch,
} from "@element-plus/icons-vue";
import type { TableInstance } from "element-plus";
import NetRequestEditor from "../components/net-request-editor.vue";

const net_req_manager = use_net_request_manager();

// #region rule lists

const table_ref = ref<TableInstance | null>(null);
const current_rules = net_req_manager.curr_rules;

const rule_action_desc: Record<RuleAction, string> = {
  allow: "Allow",
  allowAllRequests: "Allow All Requests",
  block: "Block",
  redirect: "Redirect",
  modifyHeaders: "Modify Headers",
  upgradeScheme: "Upgrade Scheme",
};
const rule_action_options: Array<{ id: RuleAction; label: string }> = [
  { id: "allow", label: rule_action_desc.allow },
  { id: "allowAllRequests", label: rule_action_desc.allowAllRequests },
  { id: "block", label: rule_action_desc.block },
  { id: "redirect", label: rule_action_desc.redirect },
  { id: "modifyHeaders", label: rule_action_desc.modifyHeaders },
  { id: "upgradeScheme", label: rule_action_desc.upgradeScheme },
];
const rule_group_options: Array<{ text: string; value: RuleGroup }> = [
  { text: "xhr", value: "xhr" },
  { text: "doc", value: "doc" },
  { text: "css", value: "css" },
  { text: "js", value: "js" },
  { text: "font", value: "font" },
  { text: "img", value: "img" },
  { text: "media", value: "media" },
  { text: "other", value: "other" },
];

function rule_groups_filter(group: string, row: BaseRuleData) {
  return row.group === group;
}

// #endregion

// #region rule operation

async function switch_rule_on(rule: BaseRuleData) {
  if (!rule.on && !rule.pattern.trim()) {
    ElMessage.warning({
      message: "Rule pattern can not be empty when ON",
      grouping: true,
    });
    return;
  }
  rule.on = !rule.on;
}

async function save_rule(rule: BaseRuleData) {
  await net_req_manager.save_rule(toRaw(rule));
}

async function copy_rule(rule: BaseRuleData) {
  await net_req_manager.copy_rule(toRaw(rule));
}

async function delete_rule(rule: BaseRuleData) {
  await net_req_manager.delete_rules([toRaw(rule)]);
}

/** 删除的是当前展示到页面中的 rules */
async function delete_listed_ruels() {
  await net_req_manager.delete_rules(toRaw(current_rules.value), true);
}

async function delete_all_ruels() {
  await net_req_manager.delete_all_rules();
}

// #endregion

// #endregion

// #region config panel

const search_input = ref("");
const is_searched = ref(false);
const current_rule_mode = net_req_manager.curr_rule_mode;

function update_current_rules_with_search() {
  const value = search_input.value.trim();
  is_searched.value = value !== "";
  net_req_manager.update_current_rules_with_search(value);
}

function switch_rule_mode() {
  current_rule_mode.value =
    current_rule_mode.value === "dynamic" ? "session" : "dynamic";
}

async function add_empty_rule() {
  await net_req_manager.add_empty_rule();
  await scroll_to_bottom();
}

async function scroll_to_bottom() {
  if (table_ref.value === null) return;

  await table_ref.value.$nextTick();
  const scrollContainer = table_ref.value?.$el?.querySelector(
    ".el-scrollbar__view",
  );
  if (scrollContainer) {
    table_ref.value?.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    });
  }
}

// #endregion

// #region rule editor

const rule_editor_visiable = ref(false);
const rule_editor_title = ref("Rule Detail");
const rule_editor_tab = ref<NetRequestEditorTabKey>("condition");
const rule_editor_data = ref<RuleActionData>({});

function open_rule_editor(rule: BaseRuleData) {
  if (rule.desc) {
    rule_editor_title.value = rule.desc;
  }

  if (rule.action === "modifyHeaders") {
    rule_editor_tab.value = "req-http-header";
    rule.action_data.req_headers = rule.action_data.req_headers || [];
    rule.action_data.res_headers = rule.action_data.res_headers || [];
  } else if (rule.action === "redirect") {
    rule_editor_tab.value = "redirect";
  } else {
    rule_editor_tab.value = "condition";
    rule.action_data.condition = rule.action_data.condition || {};
  }

  rule_editor_data.value = rule.action_data;
  rule_editor_visiable.value = true;
}

function close_rule_editor() {
  console.log(toRaw(rule_editor_data.value));
}

// #endregion

onMounted(async () => {
  await net_req_manager.init();
});
</script>

<style scoped>
.rpc-mode-text {
  font-weight: bold;
}
.lists-panel .el-table {
  height: calc(100vh - 9rem);
}
</style>
