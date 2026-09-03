<!-- Hook 设置项的还原、复用等等 -->

<template>
  <!-- 基本按钮 -->
  <el-button-group class="control-btns">
    <el-tooltip
      effect="light"
      content="清空当前的配置项，但依然保持 Hook 状态"
      :hide-after="0"
      :enterable="false"
      placement="top-start"
    >
      <el-button
        class="cure-button"
        @click="reset_setting"
        :icon="RefreshRight"
        text
        bg
      >
        还原设置
      </el-button>
    </el-tooltip>
    <el-tooltip
      effect="light"
      content="重新加载插件再刷新网页"
      :hide-after="0"
      :enterable="false"
      placement="top-start"
    >
      <el-button
        class="cure-button"
        @click="reload_extension"
        :icon="Refresh"
        text
        bg
      >
        重新加载
      </el-button>
    </el-tooltip>
    <el-tooltip
      effect="light"
      content="删除插件所有配置"
      :hide-after="0"
      :enterable="false"
      placement="top-start"
    >
      <el-button
        class="cure-button"
        @click="reset_extension"
        :icon="Refresh"
        text
        bg
      >
        重置插件
      </el-button>
    </el-tooltip>
  </el-button-group>

  <!-- #tag todo -->

  <!-- 展示当前 Tab 或者网站使用配置项的名称 -->
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <el-row style="align-items: center">
          <el-tooltip
            effect="light"
            content="当前标签页或者网站使用的配置项名称"
            :hide-after="0"
            :enterable="false"
            placement="top-start"
          >
            <el-text class="setting_name" size="large">
              {{ curr_setting_name || "未指定命名的配置项哟" }}
            </el-text>
          </el-tooltip>
        </el-row>
        <el-row class="switch_row">
          <el-tooltip
            effect="light"
            :content="
              curr_setting_mode === 'Tab'
                ? '当前的 Hook 配置仅作用于本标签页'
                : '当前的 Hook 配置仅作用于该网站'
            "
            :hide-after="0"
            :enterable="false"
            placement="bottom-start"
          >
            <el-switch
              v-model="curr_setting_mode"
              size="small"
              :before-change="check_curr_setting_name"
              @change="switch_tab_host_mode"
              width="5em"
              inline-prompt
              style="
                --el-switch-on-color: var(--cure-wink);
                --el-switch-off-color: var(--cure-kyun);
              "
              active-value="Tab"
              inactive-value="Host"
              active-text="Tab"
              inactive-text="Host"
            />
          </el-tooltip>
          <el-tooltip
            effect="light"
            content="取消使用该命名的配置项"
            :hide-after="0"
            :enterable="false"
            placement="bottom-start"
          >
            <el-button
              :icon="CircleClose"
              class="cure-button"
              text
              bg
              round
              size="small"
              :disabled="curr_setting_name === ''"
              @click="bind_to_setting_name('', curr_setting_mode)"
            >
              解除绑定
            </el-button>
          </el-tooltip>
        </el-row>
      </div>
    </template>

    <!-- 内容体 -->
    <section>
      <el-row>
        <el-input
          v-model="input_setting_name"
          @keyup.enter="save_setting_with_name(input_setting_name, true)"
          placeholder="给当前的配置命名、保存并应用"
          clearable
        >
          <template #prefix>
            <el-icon>
              <Lock />
            </el-icon>
          </template>
          <template #append>
            <el-tooltip
              effect="light"
              content="保存配置之后将默认绑定到当前标签页"
              :hide-after="0"
              :enterable="false"
              placement="top-start"
            >
              <el-button
                :icon="Plus"
                :disabled="input_setting_name === ''"
                @click="save_setting_with_name(input_setting_name, true)"
              />
            </el-tooltip>
          </template>
        </el-input>
      </el-row>
      <el-row>
        <el-select
          v-model="search_setting_name"
          @change="use_setting_with_name"
          no-match-text="╮(╯_╰)╭"
          no-data-text="(ゝ∀･) 当前没有保存的配置项哦~"
          @visible-change="(v: boolean) => v && get_all_setting_names()"
          popper-class="select-popper"
          placeholder="搜索已有的配置并应用"
          clearable
          filterable
        >
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
          <template #header>现有的配置项</template>
          <el-option
            v-for="item in all_setting_names"
            :key="item"
            :disabled="curr_setting_name === item"
            :value="item"
            class="select-option-item"
          >
            <div style="display: flex; justify-content: space-between">
              <span>{{ item }}</span>
              <!-- click.stop 点击按钮之后会删除配置项，不能让事件冒泡哟，否则就触发了 option 选中啦 -->
              <el-tooltip
                effect="light"
                :content="
                  curr_setting_name === item
                    ? '当前正在使用它哟'
                    : '删除该配置项'
                "
                :hide-after="0"
                :enterable="false"
                placement="top-start"
              >
                <el-button
                  :icon="Delete"
                  type="danger"
                  :disabled="curr_setting_name === item"
                  @click.stop="delete_setting_with_name(item)"
                  text
                  bg
                />
              </el-tooltip>
            </div>
          </el-option>
        </el-select>
      </el-row>
    </section>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  useExtensionSettingStore,
  useCureSettingStore,
  useTabInfoStore,
} from "../store";
import {
  RefreshRight,
  Refresh,
  Plus,
  Lock,
  Search,
  CircleClose,
  Delete,
} from "@element-plus/icons-vue";
import { cure_notifacation } from "../share/tools";
import { ElMessageBox } from "element-plus";

const cure_setting_store = useCureSettingStore();
const tab_info_store = useTabInfoStore();
const extension_store = useExtensionSettingStore();

/** 当前网站、标签页使用的命名配置项 */
const curr_setting_name = ref("");
/** 记录当前配置项的模式
 * 为 Tab 表示当前的命名配置项仅作用于当前标签页
 * 为 Host 表示当前的命名配置项作用于当前网站
 */
const curr_setting_mode = ref<HOOKSettingMode>("Tab");
/** 记录要保存的配置项的名称 */
const input_setting_name = ref("");
const search_setting_name = ref("");

/** 还原配置项*/
function reset_setting() {
  cure_setting_store.reset_cure_setting();
  cure_notifacation("已还原所有配置项", "success");
}

/** 重新加载插件！ */
function reload_extension() {
  cure_notifacation("即将刷新网页", "warning", {
    onClose: async () => {
      tab_info_store.reload_tab(true);
    },
    duration: 1000,
  });
}

/** 重置插件 */
async function reset_extension() {
  try {
    await ElMessageBox.confirm("是否将插件还原到初始化状态？", "重置插件", {
      type: "warning",
      center: true,
    });
    cure_notifacation("即将重置并加载插件哟~", "success", {
      duration: 2000,
      onClose: async () => {
        await extension_store.reset_extesion();
      },
    });
  } catch {}
}

//#region 配置项的绑定、切换

/** 检查当前的配置项名是否有，没有则用 tab host，并且保存它。如果一切准备好了，就返回 true */
async function check_curr_setting_name() {
  let status = true;
  const tab_host = (await tab_info_store.get_currtab_info()).tab_host;

  if (curr_setting_name.value === "") {
    const msg = tab_host
      ? "将使用网站的 Host 地址作为配置名哟~"
      : "当前网站的 Host 为空，需要指定一个配置项名字哟~";
    cure_notifacation(msg, "warning");
    if (tab_host) {
      curr_setting_name.value = tab_host;
      // 保存当前配置项名称为 host 咯
      await save_setting_with_name(tab_host);
      // 同时，绑定当前 tabId 使用该配置项
      await bind_to_setting_name(tab_host, "Tab");
    } else {
      status = false;
    }
  }
  // 当前是 Tab，说明接下来要进行切换了
  else if (curr_setting_mode.value === "Tab" && !tab_host) {
    cure_notifacation("当前网站的 Host 为空，无法切换到 Host 模式", "warning");
    status = false;
  }
  return status;
}

/** 进行模式切换。在此之前已经设置好了 curr_setting_name 了哟 */
async function switch_tab_host_mode() {
  // 所谓模式切换，就是将命名配置项绑定到 tab 或 host 咯
  await bind_to_setting_name(curr_setting_name.value, curr_setting_mode.value);
}

/** 绑定 tab 或 host 到指定名字。如果 name 为空字符串，就是取消 tab、host 原本的绑定啦 */
async function bind_to_setting_name(name: string, mode: HOOKSettingMode) {
  await cure_setting_store.bind_to_setting_name(name, mode);
  // 解除绑定之后需要重置一些状态
  if (name === "") {
    // Host 解除之后，当前配置项仅用于标签页了
    if (mode === "Host") {
      curr_setting_mode.value = "Tab";
      cure_notifacation(
        "已解除绑定，该命名配置项仅作用于当前标签页",
        "success",
      );
    } else {
      cure_notifacation(
        "已解除绑定，保留的配置项仅作用于当前标签页",
        "success",
      );
      curr_setting_name.value = "";
    }
  }
}

/** 保存配置项为某个名字，并且确定是否绑定 */
async function save_setting_with_name(name: string, bind?: boolean) {
  if (name === "") {
    return cure_notifacation("空的配置项名称哟~", "warning");
  }
  await cure_setting_store.save_setting_with_name(name);
  curr_setting_name.value = name;
  if (bind) {
    // 只要有了保存的操作，肯定要绑定到当前 tab 的！
    await bind_to_setting_name(name, "Tab");
    if (curr_setting_mode.value === "Host") {
      await bind_to_setting_name(name, "Host");
    }
  }
}

//#endregion

// #region 配置项的搜索、应用、删除

/** 删除一个命名的配置项 */
async function delete_setting_with_name(name: string) {
  console.warn("delete setting:", name);
  // 如果删除的配置项就是当前使用的，则无法删除啦
  if (curr_setting_name.value === name) {
    return cure_notifacation("当前正在使用该配置项哟~", "warning");
  }
  const names = all_setting_names.value;
  names.splice(names.indexOf(name), 1);
  all_setting_names.value = names;

  // 还需要删除底层的配置项
  await cure_setting_store.delete_one_setting(name);
}

/** 所有的配置项名称，在下拉菜单弹出之前进行获取 */
const all_setting_names = ref<string[]>([]);

/** 获取所有的配置项名称 */
async function get_all_setting_names() {
  // 先清空现有的
  all_setting_names.value = [];
  const s = await cure_setting_store.get_all_setting_names();
  all_setting_names.value = s;
}

/** 运用某个命名的配置项，有以下步骤：
 * 1. 显示该配置项名称
 * 2. 绑定到当前 Tab 或者 Host
 * 3. 刷新网页！
 */
async function use_setting_with_name(name?: string) {
  // 这种情况是按下了搜索框的清除键啦
  if (name === undefined) return;
  if (name === "") {
    return cure_notifacation("空的配置项名称哟~", "warning");
  }
  console.log(name);
  curr_setting_name.value = name;
  await bind_to_setting_name(name, curr_setting_mode.value);
  // 应用之后清空输入框的内容哟
  search_setting_name.value = "";

  cure_notifacation("以应用该配置，即将刷新网页", "warning", {
    onClose: async () => {
      tab_info_store.reload_tab(false);
      location.reload();
    },
    duration: 1500,
  });
}

// #endregion 配置项的搜索、应用、删除

onMounted(async () => {
  await extension_store.init();
  await cure_setting_store.init();

  const { name, mode } = await cure_setting_store.get_setting_name();
  curr_setting_name.value = name;
  curr_setting_mode.value = mode;
});
</script>

<style scoped>
.control-btns {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.control-btns .el-button {
  flex-grow: 1;
}

.setting_name {
  width: 100%;
  /* 让文本居中，同时隐藏右边的滚动条 */
  height: 3em;
  line-height: 2em;
  overflow: hidden;

  border: 1px solid var(--default-border-color);
  text-align: center;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  padding: 10px;
  font-weight: bold;
  color: var(--cure-idol);

  white-space: nowrap;
  letter-spacing: 3px;
  text-overflow: ellipsis;
}

.switch_row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  border: 1px solid var(--default-border-color);
  border-top: none;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  margin-top: -10px;
  padding: 5px 0;
}

.is-active {
  background-color: var(--default-light-font-color);
}

.select-option-item {
  margin-bottom: 5px;
}

.el-row {
  margin-bottom: 10px;
}

.cure-button {
  --el-button-text-color: var(--cure-idol);
}

.el-col .el-button {
  width: 100%;
}
</style>
