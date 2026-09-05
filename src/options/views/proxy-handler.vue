<!-- 配置浏览器代理 -->

<template>
  <!-- 展示有哪些代理配置项 -->
  <section class="proxy-settings">
    <el-table :data="all_proxies" border>
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
              v-if="curr_proxy !== scope.row.settingId"
              @confirm="remove_proxy_setting(scope.$index)"
            >
              <template #reference>
                <span class="el-button el-button--danger is-text is-has-bg">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </span>
              </template>
            </el-popconfirm>
            <span
              v-else
              class="el-button el-button--danger is-text is-has-bg is-disabled"
            >
              <el-icon>
                <Delete />
              </el-icon>
            </span>
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
    <el-table :data="all_servers" border>
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
            v-if="curr_server !== scope.row.settingId"
            @confirm="remove_server(scope.$index)"
          >
            <template #reference>
              <span class="el-button el-button--danger is-text is-has-bg">
                <el-icon>
                  <Delete />
                </el-icon>
              </span>
            </template>
          </el-popconfirm>
          <span
            v-else
            class="el-button el-button--danger is-text is-has-bg is-disabled"
          >
            <el-icon>
              <Delete />
            </el-icon>
          </span>
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
        @clear="clear_browser_proxy"
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
            <span class="el-button el-button--danger is-text is-has-bg">
              <el-icon style="margin-right: 5px">
                <Delete />
              </el-icon>
              Delete Server
            </span>
          </template>
        </el-popconfirm>
        <el-popconfirm title="delete?" @confirm="remove_all_proxy_setting">
          <template #reference>
            <span class="el-button el-button--danger is-text is-has-bg">
              <el-icon style="margin-right: 5px">
                <Delete />
              </el-icon>
              Delete Proxy
            </span>
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
import { nextTick, onMounted, ref } from "vue";
import FakeSelect from "@/side_panel/components/fake-select.vue";
import AutoResizeInput from "@/side_panel/components/auto-resize-input.vue";
import { computed } from "vue";
import { MagicStick, Delete, Edit, Plus } from "@element-plus/icons-vue";
import { generate_id } from "@/shared";
import { useProxy } from "../hooks/proxy";
import { ElMessage } from "element-plus";

const netproxy_manager = useProxy();

/** 当前所有的代理 */
const all_proxies = netproxy_manager.all_proxies;
// #cure-tip 测试ui
if (__IS_DEV_UI__) {
  all_proxies.value = [
    {
      settingId: "1",
      name: "proxy-1",
      mode: "fixed_servers",
    },
    {
      settingId: "2",
      name: "proxy-2",
      mode: "pac_script",
    },
  ];
}

/** 当前所有添加的服务器 */
const all_servers = netproxy_manager.all_servers;
// #cure-tip 测试ui
if (__IS_DEV_UI__) {
  all_servers.value = [
    {
      settingId: "1",
      name: "mitmproxy",
      host: "localhost",
      port: "8080",
      protocol: "http",
    },
    {
      settingId: "2",
      name: "server2",
      host: "127.0.0.1",
      port: "1080",
      protocol: "socks5",
    },
  ];
}

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

/** 获取当前所有服务器的名称 */
const server_names = computed(() => {
  const res: Array<{ id: string; label: string; value: string }> = [];
  for (const setting of all_servers.value) {
    setting.name &&
      res.push({
        id: setting.settingId,
        label: setting.name,
        value: setting.settingId,
      });
  }
  return res;
});
/** 获取当前所有代理配置项的名称 */
const proxy_names = computed(() => {
  const res: Array<{ id: string; name: string }> = [];
  for (const setting of all_proxies.value) {
    setting.name &&
      res.push({
        id: setting.settingId,
        name: setting.name,
      });
  }
  return res;
});

/** 当前使用的 proxy 的 id */
const curr_proxy = netproxy_manager.curr_proxy;
const curr_server = netproxy_manager.curr_server;
/** 当前使用的 proxy 的名称 */
const curr_proxy_name = netproxy_manager.curr_proxy_name;

/** 当选中一个 proxy 代理配置项作为浏览器代理时触发，在这里进行检查，最终设置浏览器的代理  */
async function select_browser_proxy(settingId: string) {
  // 点击清空按钮时会是这种情况
  if (!settingId) return;

  const msg = await netproxy_manager.check_selected_proxy(settingId);
  if (msg) {
    ElMessage.warning(msg);
    return;
  }

  await netproxy_manager.set_browser_proxy(settingId);
}

/** 取消当前的代理设置 */
async function clear_browser_proxy() {
  await netproxy_manager.set_browser_proxy();
}

onMounted(async () => {
  await netproxy_manager.init();
});

// #region 添加一行

async function add_proxy_setting() {
  if (__IS_DEV_UI__) {
    all_proxies.value.push({
      settingId: generate_id(),
      name: "",
      mode: "direct",
    });
  } else {
    netproxy_manager.add_empty_proxy();
  }
}

async function add_server() {
  if (__IS_DEV_UI__) {
    all_servers.value.push({
      settingId: generate_id(),
      name: "",
      host: "",
      port: "",
      protocol: "http", // 根据文档，这就是默认值
    });
  } else {
    netproxy_manager.add_empty_server();
  }
}

// #endregion 添加一行

// #region 删除一行或全部

async function remove_proxy_setting(index: number) {
  all_proxies.value.splice(index, 1);
}

async function remove_all_proxy_setting() {
  if (!curr_proxy.value) {
    all_proxies.value = [];
    await add_proxy_setting();
    return;
  }

  const res = [];
  for (const proxy of all_proxies.value) {
    if (proxy.settingId === curr_proxy.value) {
      res.push(proxy);
    }
  }
  all_proxies.value = res;
  ElMessage.success("deleted all proxy settings, only keep the current one");
}

async function remove_server(index: number) {
  all_servers.value.splice(index, 1);
}

/** 删除所有服务器，并添加一个空配置。如果当前已经有使用的服务器，则不会删除 */
async function remove_all_server() {
  if (!curr_server.value) {
    all_servers.value = [];
    await add_server();
    return;
  }

  const res = [];
  for (const server of all_servers.value) {
    if (server.settingId === curr_server.value) {
      res.push(server);
    }
  }
  all_servers.value = res;
  ElMessage.success("deleted all servers, only keep the current one");
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

//  #endregion 编辑代理配置项

async function aha() {
  ElMessage.info("Aha ( ºΔº )  魔法少女正在打怪悄悄升级~~");
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
