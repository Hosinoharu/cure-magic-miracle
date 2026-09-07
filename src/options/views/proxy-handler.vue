<!-- 配置浏览器代理 -->

<template>
  <!-- 展示有哪些代理配置项 -->
  <section class="proxy-settings">
    <el-table :data="all_proxies" border :row-class-name="proxy_row_class_name">
      <el-table-column prop="name" label="Proxy Name">
        <template #header>
          <span style="color: var(--cure-idol)">Proxy Name</span>
        </template>
        <template #default="scope">
          <AutoResizeInput
            v-model="scope.row.name"
            :light_disabled="curr_proxy === scope.row.settingId"
            placeholder="(´･ω･`) Name"
          />
        </template>
      </el-table-column>
      <el-table-column prop="mode" label="Proxy Mode">
        <template #default="scope">
          <FakeSelect
            v-model="scope.row.mode"
            :disabled="curr_proxy === scope.row.settingId"
            :operations="proxy_modes"
            placeholder="(・∀・) Mode"
          />
        </template>
      </el-table-column>
      <!-- 用于 http/https/ftp 的服务器名称 -->
      <el-table-column prop="server" label="Proxy Server">
        <template #default="scope">
          <FakeSelect
            v-model="scope.row.server"
            :disabled="
              scope.row.mode !== 'fixed_servers' ||
              curr_proxy === scope.row.settingId
            "
            :operations="server_names"
            placeholder="(´･ω･`) HTTP/HTTPS/FTP Server"
          />
        </template>
      </el-table-column>
      <el-table-column width="115">
        <template #default="scope">
          <el-button-group>
            <el-button
              type="primary"
              @click="edit_proxy(scope.row as OneProxySettingRow)"
              :icon="Edit"
              :disabled="
                scope.row.mode !== 'pac_script' ||
                curr_proxy === scope.row.settingId
              "
              text
              bg
            />
            <el-popconfirm
              title="delete?"
              @confirm="remove_proxy_setting(scope.row as OneProxySettingRow)"
            >
              <template #reference>
                <el-button
                  type="danger"
                  :icon="Delete"
                  :disabled="curr_proxy === scope.row.settingId"
                  text
                  bg
                ></el-button>
              </template>
            </el-popconfirm>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-divider
    border-style="none"
    style="margin: 20px 0; --el-bg-color: transparent"
  >
    <el-icon @click="aha">
      <MagicStick style="color: var(--cure-idol)" />
    </el-icon>
  </el-divider>

  <!-- 展示所有添加的服务器 -->
  <section class="proxy-servers">
    <el-table
      :data="all_servers"
      border
      :row-class-name="server_row_class_name"
    >
      <el-table-column prop="name" label="Server Name">
        <template #header>
          <span style="color: var(--cure-idol)">Server Name</span>
        </template>
        <template #default="scope">
          <AutoResizeInput
            v-model="scope.row.name"
            :light_disabled="curr_server === scope.row.settingId"
            placeholder="(´･ω･`) Server Name"
          />
        </template>
      </el-table-column>
      <el-table-column prop="host" label="Server Host">
        <template #default="scope">
          <AutoResizeInput
            v-model="scope.row.host"
            :disabled="curr_server === scope.row.settingId"
            placeholder="(´･ω･`) Server Host"
          />
        </template>
      </el-table-column>
      <el-table-column prop="port" label="Server Port">
        <template #default="scope">
          <AutoResizeInput
            v-model="scope.row.port"
            number
            :disabled="curr_server === scope.row.settingId"
            placeholder="(´･ω･`) Server Port"
          />
        </template>
      </el-table-column>
      <el-table-column prop="protocol" label="Server Protocol">
        <template #default="scope">
          <FakeSelect
            v-model="scope.row.protocol"
            :disabled="curr_server === scope.row.settingId"
            :operations="server_schemes"
            placeholder="(・∀・) Server Protocol"
          />
        </template>
      </el-table-column>
      <el-table-column width="70">
        <template #default="scope">
          <el-popconfirm
            title="delete?"
            @confirm="remove_server(scope.row as ProxyServerSetting)"
          >
            <template #reference>
              <el-button
                type="danger"
                :icon="Delete"
                :disabled="curr_server === scope.row.settingId"
                text
                bg
              ></el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <!-- 顶部控制条，指定当前使用哪个代理！ -->
  <section class="control-bar-container">
    <section class="control-bar">
      <el-button-group>
        <el-button type="primary" @click="add_server" :icon="Plus" text bg>
          Add Server
        </el-button>
        <el-button
          type="primary"
          @click="add_proxy_setting"
          :icon="Plus"
          text
          bg
        >
          Add Proxy
        </el-button>
      </el-button-group>
      <el-select
        class="selected-proxy"
        v-model="curr_proxy_name"
        @change="select_browser_proxy"
        @clear="cancel_browser_proxy"
        clearable
        placeholder="(・∀・) Select Current Proxy"
        style="width: 40%"
      >
        <el-option
          v-for="item in proxy_names"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
        <template #label="{ label }">
          <span>Current Used Proxy:</span>
          <span style="color: var(--cure-idol); font-weight: bold">
            {{ label }}
          </span>
        </template>
      </el-select>
      <el-button-group>
        <el-popconfirm title="delete?" @confirm="remove_all_server">
          <template #reference>
            <el-button type="danger" :icon="Delete" text bg>
              Delete Server
            </el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm title="delete?" @confirm="remove_all_proxy_setting">
          <template #reference>
            <el-button type="danger" :icon="Delete" text bg>
              Delete Proxy
            </el-button>
          </template>
        </el-popconfirm>
      </el-button-group>
    </section>
  </section>

  <el-dialog
    v-model="show_dialog"
    title="Edit PAC Script"
    @opened="dialog_opened"
    :before-close="before_dialog_close"
    destroy-on-close
  >
    <el-input
      ref="input_pac_elem"
      v-model="input_pac_script"
      autofocus
      type="textarea"
      :autosize="{ minRows: 10, maxRows: 20 }"
    />
    <template #footer>
      <div class="dialog-footer">
        <el-button type="danger" text bg @click="input_pac_script = ''">
          Clear
        </el-button>
        <el-button @click="show_dialog = false" text bg>Cancel</el-button>
        <el-button type="primary" @click="edit_ok" text bg>OK</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import FakeSelect from "@/side_panel/components/fake-select.vue";
import AutoResizeInput from "@/side_panel/components/auto-resize-input.vue";
import { MagicStick, Delete, Edit, Plus } from "@element-plus/icons-vue";
import useProxy from "../hooks/proxy";
import { ElMessage } from "element-plus";

const proxy_manager = useProxy();

/** 当前所有的代理 */
const all_proxies = proxy_manager.all_proxies;
/** 当前所有添加的服务器 */
const all_servers = proxy_manager.all_servers;
/** 当前使用的 proxy 的 id */
const curr_proxy = proxy_manager.curr_proxy;
const curr_server = proxy_manager.curr_server;

/** 当前使用的 proxy 的名称 */
const curr_proxy_name = ref("");
/** 更新当前使用的 proxy 代理配置项的名称 */
function update_curr_proxy_name(clear: boolean) {
  if (clear) {
    curr_proxy_name.value = "";
    return;
  }

  const id = curr_proxy.value;
  if (!id) return;

  curr_proxy_name.value =
    all_proxies.value.find(v => v.settingId === id)?.name || "";
}

/** 获取当前所有服务器的名称 */
const server_names = computed(() => {
  const names: Array<{ id: string; label: string; value: string }> = [];
  for (const server of all_servers.value) {
    if (!server.name) continue;
    names.push({
      id: server.settingId,
      label: server.name,
      value: server.settingId,
    });
  }
  return names;
});

/** 获取当前所有代理配置项的名称 */
const proxy_names = computed(() => {
  const names: Array<{ id: string; name: string }> = [];
  for (const proxy of all_proxies.value) {
    if (!proxy.name) continue;
    names.push({
      id: proxy.settingId,
      name: proxy.name,
    });
  }
  return names;
});

/** 用于 ui 展示可选择的代理模式 */
const proxy_modes = [
  { id: "1", label: "No Proxy", value: "direct" },
  { id: "2", label: "System Proxy", value: "system" },
  { id: "3", label: "Proxy Server", value: "fixed_servers" },
  { id: "4", label: "PAC Script", value: "pac_script" },
  // { id: 5, label: "自动检测", value: "auto_detect" }, // 不启用该功能，麻烦
];

/** 用于 ui 展示可选择的服务器本身支持的协议。默认为 HTTP */
const server_schemes = [
  { id: "1", label: "HTTP", value: "http" },
  { id: "2", label: "HTTPS", value: "https" },
  { id: "3", label: "QUIC", value: "quic" },
  { id: "4", label: "SOCKS4", value: "socks4" },
  { id: "5", label: "SOCKS5", value: "socks5" },
];

/** 选中一个 proxy 代理配置项作为浏览器代理  */
async function select_browser_proxy(proxyId: string) {
  if (!proxyId) return;
  const ok = await proxy_manager.set_browser_proxy(proxyId);
  update_curr_proxy_name(!ok);
}

/** 取消当前的代理设置 */
async function cancel_browser_proxy() {
  await proxy_manager.cancel_browser_proxy();
}

onMounted(async () => {
  await proxy_manager.init();
});

function proxy_row_class_name({ row }: { row: OneProxySettingRow }) {
  return row.settingId === curr_proxy.value ? "highlight-selected-row" : "";
}

function server_row_class_name({ row }: { row: OneProxySettingRow }) {
  return row.settingId === curr_server.value ? "highlight-selected-row" : "";
}

// #region add

async function add_proxy_setting() {
  await proxy_manager.add_empty_proxy();
}

async function add_server() {
  await proxy_manager.add_empty_server();
}

// #endregion

// #region delete

async function remove_proxy_setting(p: OneProxySettingRow) {
  await proxy_manager.del_proxy(p.settingId);
  if (all_proxies.value.length == 0) {
    add_proxy_setting();
  }
}

async function remove_all_proxy_setting() {
  await proxy_manager.del_all_proxy();
  if (all_proxies.value.length == 0) {
    add_proxy_setting();
  }
}

async function remove_server(s: ProxyServerSetting) {
  await proxy_manager.del_server(s.settingId);
  if (all_servers.value.length == 0) {
    add_server();
  }
}

async function remove_all_server() {
  await proxy_manager.del_all_server();
  if (all_servers.value.length == 0) {
    add_server();
  }
}

// #endregion

// #region 编辑代理配置项

/** 控制 dialog 显示 */
const show_dialog = ref(false);
/** 记录输入的 pac 脚本 */
const input_pac_script = ref("");
/** 引用输入 pac script 的 el-input 元素 */
const input_pac_elem = ref();
/** 记录进入编辑时的对象 */
const dialog_target = ref<OneProxySettingRow | null>(null);

/** 编辑代理配置项 —— 仅在 pac_stript 模式使用，指定使用的 pac 脚本啦 */
async function edit_proxy(row: OneProxySettingRow) {
  show_dialog.value = true;
  input_pac_script.value = row.pac_script || "";
  dialog_target.value = row;
}

async function dialog_opened() {
  await nextTick();
  input_pac_elem.value.focus();
}

async function before_dialog_close() {
  await edit_ok();
}

async function edit_ok() {
  show_dialog.value = false;
  if (dialog_target.value) {
    dialog_target.value.pac_script = input_pac_script.value;
  }
}

//  #endregion

async function aha() {
  ElMessage.info({
    message: "Aha ( ºΔº )  魔法少女正在打怪悄悄升级~~",
    grouping: true,
  });
}
</script>

<style scoped>
.proxy-servers {
  /* 因为底部控制条存在，所以要留出地方避免被遮挡 */
  margin-bottom: 100px;
}

.control-bar-container {
  display: flex;
  justify-content: center;

  position: fixed;
  margin-left: -40px;
  border-top: 2px solid var(--cure-idol);
  background-color: #121212;

  width: 100%;
  height: 100px;
  bottom: 0;

  /* 在表格上面 */
  z-index: 100;
}

.control-bar {
  display: flex;
  justify-content: center;
  align-items: center;

  width: 90%;
}

.control-bar .el-button {
  width: 130px;
}

.selected-proxy {
  margin: 0 50px;
}
</style>

<style>
/** 当前起作用的 proxy、server 行需要高亮 */
.el-table .highlight-selected-row {
  background: var(--el-color-info-light-7);
}
</style>
