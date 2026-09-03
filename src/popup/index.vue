<!-- eslint-disable vue/multi-word-component-names -->
<!-- 配置标题以及主体组件 -->

<template>
  <el-container>
    <!-- 标题！当启用、关闭 hokk 时它会有所改变哟 -->
    <el-header @click="toogle_hook_state">
      <el-text>
        <mahou-star
          :rotate="cure_setting_store.curr_cure_setting.enable_hook"
          :dark="!cure_setting_store.curr_cure_setting.enable_hook"
          style="margin-right: 20px"
        />
      </el-text>
      <el-text
        style="margin-left: 5px"
        :class="{
          active: cure_setting_store.curr_cure_setting.enable_hook,
          deactive: !cure_setting_store.curr_cure_setting.enable_hook,
        }"
      >
        Cure Magic ♡ Miracle ♪
      </el-text>
    </el-header>
    <el-main>
      <main-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import MainView from "./views/main-view.vue";
import MahouStar from "./components/mahou-star.vue";
import { useCureSettingStore, useTabInfoStore } from "./store";
import type { Action } from "element-plus";
import { ElMessageBox } from "element-plus";
import { cure_notifacation } from "./share/tools";

const cure_setting_store = useCureSettingStore();
const tab_info_store = useTabInfoStore();

/** 开启或关闭当前网站的 Hook */
function toogle_hook_state() {
  if (cure_setting_store.dev_mode) {
    return cure_notifacation("Dev Mode 无法更改 Hook 状态", "warning");
  }

  const enable_hook = (cure_setting_store.curr_cure_setting.enable_hook =
    !cure_setting_store.curr_cure_setting.enable_hook);
  const state = enable_hook ? "启用" : "关闭";
  const msg = `刷新网站才能${state} Hook`;

  const tid = setTimeout(() => {
    tab_info_store.reload_tab();
    ElMessageBox.close();
  }, 2000);

  ElMessageBox.alert(msg + "。2s 后自动刷新", `(～￣▽￣)～`, {
    type: "warning",
    buttonSize: "small",
    confirmButtonText: "取消自动刷新",
    callback: (action: Action) => {
      action === "confirm" && clearTimeout(tid);
    },
  });
}

// #tag 组件初始化 获取配置项，并展示hook状态
onMounted(async () => {
  await cure_setting_store.init();
});
</script>

<!-- 设置当前组件样式 -->
<style scoped>
.el-header {
  margin-top: 20px;
  margin-bottom: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #888;
  text-align: center;

  font-weight: bolder;
  font-family: "Courier New";
  height: fit-content;
  cursor: pointer;
  user-select: none;
}

.el-header .el-text {
  --el-text-font-size: 5vw;
}

.deactive {
  color: #666;
}

/* 启用 Hook 时标题使用的样式 */
.active {
  background: linear-gradient(
    to right,
    var(--cure-idol),
    var(--cure-wink),
    var(--cure-kyun),
    var(--cure-idol),
    var(--cure-wink),
    var(--cure-kyun)
  );
  background-clip: text;
  background-size: 300% 100%;
  color: transparent;
  animation: flow_color 10s linear infinite alternate;
}

@keyframes flow_color {
  from {
    background-position: 0% 0%;
  }

  to {
    background-position: 300% 0%;
  }
}
</style>
