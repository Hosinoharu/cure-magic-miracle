<!-- 配置插件自身的配置项 -->

<template>
  <!-- 打开一些界面 -->
  <el-button-group class="open-page">
    <el-button class="cure-button" @click="open_options_page" text bg>
      配置页面
    </el-button>
    <el-button class="cure-button" @click="open_side_page" text bg>
      侧边栏
    </el-button>
  </el-button-group>

  <setting-view :setting="default_extension_setting" target="Extension" />

  <section class="footer">
    <div class="link-area">
      <el-link
        href="https://github.com/Hosinoharu/cure-magic-miracle/wiki"
        target="_blank"
        type="info"
        @click="cure_notifacation('外出打史莱姆还没回来写呢', 'info')"
      >
        查看教程 - Github
      </el-link>
      <el-text>
        <mahou-star
          style="margin: 0 10px"
          :light="star_center ? 'idol' : undefined"
          :dark="!star_center"
        />
      </el-text>
      <el-link
        href="https://github.com/Hosinoharu/cure-magic-miracle/issues/new"
        target="_blank"
        type="info"
      >
        反馈建议 - Github
      </el-link>
    </div>
    <el-progress
      :percentage="progress_num"
      :stroke-width="3"
      :show-text="false"
      :color="progress_color"
      style="margin: 10px auto; width: 80%"
    />
    <section id="mahou-area">
      <el-text>
        <mahou-star
          :light="star_left ? 'wink' : undefined"
          :dark="!star_left"
        />
      </el-text>
      <section id="mahou" :class="{ active: star_left }">
        <el-text>你也想</el-text>
        <el-text>
          <mahou-stick
            :light_left="star_left"
            :light_right="star_right"
            :light_center="star_center"
          />
        </el-text>
        <el-text>成为魔法少女吗</el-text>
      </section>
      <el-text>
        <mahou-star
          :light="star_right ? 'kyun' : undefined"
          :dark="!star_right"
        />
      </el-text>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import SettingView from "../components/setting-viewer.vue";
import MahouStar from "../components/mahou-star.vue";
import MahouStick from "../components/mahou-stick.vue";
import { useExtensionSettingStore } from "../store";
import { default_extension_setting } from "../share/setting_info";
import { ElMessage } from "element-plus";
import { cure_notifacation } from "../share/tools";

const store = useExtensionSettingStore();

//#region mahou

/** 开启魔法需要按 3 次嘛~~~ */
let mahou_energy = 0;
// 控制点亮左右两边的星星
const star_left = ref(false);
const star_right = ref(false);
const star_center = ref(false);

const progress_num = ref(0);
const progress_color = [
  {
    // 这说明 [0, 33) 显示这个颜色
    // 所以当 progress_num.value = 33 时，显示 cure-kyun 了
    // 故这里应该多一个，所以为 34。后面同理
    percentage: 34,
    color: "var(--cure-wink)",
  },
  {
    percentage: 67,
    color: "var(--cure-kyun)",
  },
  {
    percentage: 100,
    color: "var(--cure-idol)",
  },
];

function init_mahou() {
  const mahou = document.querySelector("#mahou") as HTMLSpanElement;
  if (!mahou) {
    ElMessage.error("空间紊乱，沟通魔法传送阵失败");
    return;
  }

  // 去往魔法少女世界
  mahou.addEventListener("click", () => {
    mahou_energy++; // 充能 3 次哟

    switch (mahou_energy) {
      case 1:
        mahou.style.backgroundColor = "var(--cure-wink)";

        progress_num.value = 33;
        star_left.value = true;
        break;
      case 2:
        mahou.style.background =
          "linear-gradient(to right, var(--cure-wink), var(--cure-kyun))";
        mahou.style.backgroundClip = "text";

        progress_num.value = 66;
        star_right.value = true;
        break;
      case 3:
        mahou.style.background =
          "linear-gradient(to right, var(--cure-wink), var(--cure-idol), var(--cure-kyun))";
        mahou.style.backgroundClip = "text";

        progress_num.value = 100;
        star_center.value = true;
        ElMessage.success({
          message: "ヾ(≧▽≦*)o",
          duration: 3000,
          onClose: () => {
            chrome.tabs.create({
              url: "https://www.toei-anim.co.jp/tv/precure/",
              active: true,
            });
          },
        });
        break;
      default:
        break;
    }
  });
}

// #endregion

function open_options_page() {
  // #cure-todo 暂时移除配置项功能
  cure_notifacation("还未迁移该功能", "info");
  // chrome.runtime.openOptionsPage();
}

/** 在当前浏览器窗口中打开一个【全局侧边栏】 */
async function open_side_page() {
  // #cure-todo 暂时移除侧边栏功能
  cure_notifacation("还未迁移该功能", "info");
  // const window = await chrome.windows.getCurrent();
  // if (!window.id) {
  //     return ElMessage.error("open side panel failed");
  // }

  // chrome.sidePanel.open({ windowId: window.id });
}

onMounted(async () => {
  await store.init();

  init_mahou();
});
</script>

<style scoped>
.open-page {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.cure-button {
  flex-grow: 1;
  --el-button-text-color: var(--cure-idol);
}

/* #region footer link-area */

.footer {
  border: 1px solid #4c4d4f;
  padding: 20px 0;
}

.link-area {
  text-align: center;
  font-size: 1rem;
  display: flex;
  justify-content: center;
}

.link-area .el-icon {
  margin: 0 10px;
  color: #4c4d4f;
}

/* #endregion footer link-area  */

/* #region footer mahou-area */

#mahou-area {
  text-align: center;
  /* font-size: 1rem; */

  display: flex;
  justify-content: center;
}

#mahou {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--default-font-color);
  background-clip: text;
  color: transparent;
  border: none;
  margin: 0 10px;
}

#mahou .el-text {
  color: transparent;
}

#mahou:hover {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
  transition: all 0.5s ease-in-out;
}

/* #endregion footer mahou-area  */
</style>
