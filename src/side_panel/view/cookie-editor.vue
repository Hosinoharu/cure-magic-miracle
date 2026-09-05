<!-- 编辑 cookie -->

<template>
  <section class="cookies-body">
    <section v-if="cookies.length !== 0">
      <section
        class="one-cookie-item"
        v-for="(cookie, index) in cookies"
        :key="cookie.cookieId!"
      >
        <el-descriptions label-width="6vw" border>
          <template #title>
            <section class="descriptions-title">
              <!-- 控制 cookie 信息的展开与折叠 -->
              <el-button
                text
                style="width: 10px"
                :icon="cookie.collapse ? ArrowRight : ArrowDown"
                @click="cookie.collapse = !cookie.collapse"
              />
              <AutoResizeInput
                v-model="cookie.name"
                spellcheck="false"
                placeholder="please input one cookie name"
                text_style="color: var(--cure-idol); font-size: 1.2em; width: calc(100vw - 165px);"
              />
            </section>
          </template>

          <template #extra>
            <el-button-group>
              <el-button
                type="primary"
                :icon="Finished"
                text
                @click="apply_one_cookie(cookie)"
              />
              <el-button
                type="danger"
                :icon="Delete"
                text
                @click="delete_cookie(index)"
              />
            </el-button-group>
          </template>

          <section class="descriptions-body" v-if="!cookie.collapse">
            <el-descriptions-item
              label="Value"
              :span="3"
              class-name="cookie-value-style"
            >
              <template #label>
                <span style="color: var(--cure-kiss)">Value</span>
              </template>
              <AutoResizeInput
                v-model="cookie.value"
                autoresize
                placeholder="please input one cookie value"
                spellcheck="false"
              />
            </el-descriptions-item>

            <el-descriptions-item
              label="Domain"
              width="39vw"
              class-name="cookie-domain-style"
            >
              <AutoResizeInput
                v-model="cookie.domain"
                text_style="width: 39vw;"
                placeholder="cookie domain"
              />
            </el-descriptions-item>
            <el-descriptions-item
              label="Path"
              width="39vw"
              class-name="cookie-path-style"
            >
              <AutoResizeInput
                v-model="cookie.path"
                placeholder="cookie path"
              />
            </el-descriptions-item>
            <el-descriptions-item label="HttpOnly" width="4vw">
              <!-- 让 label 可以点击进行选中 -->
              <template #label>
                <div
                  class="clickable_cell"
                  @click="cookie.httpOnly = !cookie.httpOnly"
                >
                  HttpOnly
                </div>
              </template>
              <el-checkbox v-model="cookie.httpOnly" />
            </el-descriptions-item>

            <el-descriptions-item label="Expires" width="39vw">
              <!-- 前面已经在 OnMounted 中处理了 cookie 的时间戳！ -->
              <AutoResizeInput
                v-model="cookie.expires!"
                text_style="width: 39vw;"
                placeholder="session cookie (default)"
              />
            </el-descriptions-item>
            <el-descriptions-item label="SameSite">
              <FakeSelect
                v-model="cookie.sameSite"
                :clearable="false"
                :operations="same_site_options"
              />
            </el-descriptions-item>
            <el-descriptions-item label="Secure">
              <template #label>
                <div
                  class="clickable_cell"
                  @click="cookie.secure = !cookie.secure"
                >
                  Secure
                </div>
              </template>
              <el-checkbox v-model="cookie.secure" />
            </el-descriptions-item>
          </section>
        </el-descriptions>
      </section>
    </section>
    <el-empty v-else description="no cookies" />
  </section>

  <el-backtop :right="30" :bottom="10" style="z-index: 200" />

  <!-- 专门增加控制内容的 -->
  <section class="control-bar-container">
    <section class="control-bar">
      <el-text class="tab-url-row">
        [
        <el-text size="large">{{ current_tab_url }}</el-text>
        ]
      </el-text>
      <el-button-group
        class="control-btns"
        :class="{
          'narrow-bottom': is_small_screen,
        }"
      >
        <el-button @click="add_one_cookie" :icon="Plus">
          {{ is_small_screen ? "" : "add" }}
        </el-button>
        <el-button
          @click="toogle_collapse"
          :icon="collapse_all ? ArrowRight : ArrowDown"
        >
          {{ is_small_screen ? "" : collapse_all ? "collapse" : "expand" }}
        </el-button>
        <el-button
          @click="refresh_cookies(current_tab_url)"
          :icon="RefreshRight"
        >
          {{ is_small_screen ? "" : "refresh" }}
        </el-button>
        <el-button @click="copy_cookies" :icon="CopyDocument">
          {{ is_small_screen ? "" : "copy" }}
        </el-button>
        <el-button @click="import_cookies" :icon="Upload">
          {{ is_small_screen ? "" : "import" }}
        </el-button>
        <el-button @click="export_cookies" :icon="Download">
          {{ is_small_screen ? "" : "export" }}
        </el-button>

        <el-button @click="clear_all_cookies" :icon="Delete">
          {{ is_small_screen ? "" : "clear" }}
        </el-button>
      </el-button-group>
    </section>
  </section>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  CopyDocument,
  Delete,
  Download,
  Finished,
  Plus,
  RefreshRight,
  Upload,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { onMounted, ref, onUnmounted } from "vue";
import { debounce } from "lodash-es";

import AutoResizeInput from "../components/auto-resize-input.vue";
import FakeSelect from "../components/fake-select.vue";
import { generate_id, scroll_to_bottom } from "@/shared";

/** 记录当前展示的、标签页的地址！ */
const current_tab_url = ref("");
/** 记录获取到的 cookie 信息 */
const cookies = ref<MyCookie[]>([]);
/** 当窗口宽度变小到一定程度时，部分按钮将只显示图标，而不显示文件 */
const is_small_screen = ref(false);
/** 当 resize 事件触发时，调整 `is_small_screen` 的值 */
function check_screen_size() {
  // 底部按钮一个宽度 100，共有 6 个按钮，但稍微增加一点偏差
  is_small_screen.value = window.innerWidth <= 620;
}
/** 是否折叠所有 cookie */
const collapse_all = ref(true);
/** 格式化时间戳形式所用 */
const data_formatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** 将 cookie 的 expirationDate 从 Unix 时间戳形式转为【良好阅读性的格式】：年-月-日 时:分:秒
 *
 * 对于毫秒级时间戳会丢失精度：`new Date(1774837503.210134).getTime()` 将无法完整还原回去，丢失了毫秒
 */
function format_expire(s: number) {
  const seconds = Math.floor(s);
  const milliseconds = Math.round((s - seconds) * 1000);
  const date = new Date(seconds * 1000 + milliseconds);
  return data_formatter.format(date);
}
/** 将 2025-08-11 10:10:10 这样的时间形式转为 Unix 时间戳 */
function utc_to_expire(s: string) {
  const v = new Date(s).getTime();
  return v / 1000;
}

/** 对当前的 cookie expire 进行格式化，转为阅读性更好的格式再进行展示
 * - 添加 `cookieId`
 * - 将 `expire` 时间戳进行转换
 * - 默认折叠 cookie 信息
 */
function init_cookie_format(cookies: MyCookie[]) {
  for (const cookie of cookies) {
    cookie.cookieId = generate_id();
    cookie.expires = cookie.expirationDate
      ? format_expire(cookie.expirationDate)
      : "";
    cookie.collapse = true;
  }
}

/** 在选择 SameSite 值时可以选择的项 */
const same_site_options: Array<`${chrome.cookies.SameSiteStatus}`> = [
  "unspecified",
  "no_restriction",
  "lax",
  "strict",
];

//#region cookie操作

/** 将 MyCookie 类型转为 chrome 插件的标准的 cookie 类型 */
function format_mycookie(cookie: MyCookie): chrome.cookies.Cookie {
  const c: chrome.cookies.Cookie = {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    // cookie.expire 存储了格式化后的时间，界面中编辑的也是该格式，所以此处需要将其转为时间戳
    expirationDate: cookie.expires ? utc_to_expire(cookie.expires) : undefined,
    path: cookie.path,
    hostOnly: cookie.hostOnly,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite || "unspecified",
    secure: cookie.secure,
    // 不能再根据原来的 session 来判断，因为并没有提供编辑该字段的功能
    // 所以只好根据【实际编辑的 cookie expire】来判断
    session: !cookie.expires,
    storeId: cookie.storeId,
  };
  return c;
}

/** 封装 `chrome.cookies.set` API。设置之前先进行删除！ */
async function set_one_cookie(cookie: chrome.cookies.Cookie) {
  const url = current_tab_url.value;
  await chrome.cookies.remove({ url, name: cookie.name });
  // 本来导入的 cookie.domain 为 www.netbian.com
  // 但添加到浏览器后，该 cookie.domain 变为了 .www.netbian.com，多了个点
  // 不能直接使用 {...cookie}，因为 cookie 中有部分字段是无效的，会报错
  await chrome.cookies.set({
    url,
    domain: cookie.domain,
    name: cookie.name,
    value: cookie.value,
    expirationDate: cookie.expirationDate,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    partitionKey: cookie.partitionKey,
    storeId: cookie.storeId,
  });
}

/** 应用一个 cookie，当修改一个 cookie 之后需要点击【应用】 */
async function apply_one_cookie(cookie: MyCookie) {
  if (!cookie.name || !cookie.value)
    return ElMessage.warning("cookie name/value is empty");
  if (!__IS_DEV_UI__) {
    try {
      await set_one_cookie(format_mycookie(cookie));
    } catch (e) {
      console.log("apply one cookie failed:", e);
      return ElMessage.error(`apply cookie failed`);
    }
  }
  ElMessage.success("apply cookie");
}

/** 删除一个指定的 cookie */
async function delete_cookie(index: number) {
  const cookie = cookies.value[index];
  cookies.value.splice(index, 1);
  if (!cookie || !cookie.name) return;
  if (!__IS_DEV_UI__) {
    const res = await chrome.cookies.remove({
      url: current_tab_url.value,
      name: cookie.name,
    });
    console.log("delete one cookie:", res);
  }
}

/** 刷新 cookie，即重新获取当前标签页对应网站的 cookie */
async function refresh_cookies(url: string) {
  if (__IS_DEV_UI__) return init_cookie_when_dev();
  url = new URL(url).origin;
  current_tab_url.value = url;
  const tab_cookies = await chrome.cookies.getAll({ url });
  init_cookie_format(tab_cookies);
  cookies.value = tab_cookies;
  ElMessage({
    type: "success",
    message: "refresh cookies",
    grouping: true,
    duration: 1000,
  });
}

/** 切换状态：折叠或展开所有 cookie 的详细信息 */
function toogle_collapse() {
  const v = !collapse_all.value;
  for (const cookie of cookies.value) {
    cookie.collapse = v;
  }
  collapse_all.value = v;
}

async function add_one_cookie() {
  const c: MyCookie = {
    cookieId: generate_id(),
    name: "",
    value: "",
    domain: cookies.value[0]?.domain || "",
    path: "/",
    httpOnly: false,
    // 默认为 session cookie 的格式
    expires: "",
    sameSite: "unspecified",
    secure: false,
    session: true,
    hostOnly: false,
    storeId: "0",
  };
  cookies.value.push(c);
  await scroll_to_bottom();
}

/** 以 `key=value` 的形式复制当前所有 cookie */
async function copy_cookies() {
  if (cookies.value.length === 0) {
    return ElMessage.warning("no cookies");
  }

  const res = [] as string[];
  for (const cookie of cookies.value) {
    if (!cookie.name || !cookie.value) continue;
    res.push(`${cookie.name}=${cookie.value}`);
  }
  if (res.length === 0) {
    return ElMessage.warning("no useful cookies");
  }

  try {
    navigator.clipboard.writeText(res.join("; "));
    ElMessage.success("copy cookies");
  } catch (_) {
    ElMessage.error("copy cookies failed");
  }
}

async function clear_all_cookies() {
  if (!__IS_DEV_UI__) {
    for (const cookie of cookies.value) {
      if (!cookie.name) continue;
      await chrome.cookies.remove({
        url: current_tab_url.value,
        name: cookie.name,
      });
    }
  }
  cookies.value = [];
}

/** 将当前所有的 cookies 应用到网站中 */
async function apply_cookies(cookies: chrome.cookies.Cookie[]) {
  if (__IS_DEV_UI__) return;
  for (const cookie of cookies) {
    if (!cookie.name || !cookie.value) continue;

    await set_one_cookie(cookie);
  }
}

/** 从文件导入 cookie */
function import_cookies() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return ElMessage.error("no file selected");

    const text = await file.text();
    if (!text) return ElMessage.warning("file is empty");

    try {
      const input_cookies = JSON.parse(text) as chrome.cookies.Cookie[];
      // 先清空现有 cookie 然后进行应用？？还是同名覆盖好了吧
      await clear_all_cookies();
      await apply_cookies(input_cookies);

      init_cookie_format(input_cookies);
      cookies.value = input_cookies;
    } catch (e) {
      ElMessage.error("cookie file format error");
      console.log("import cookie error:", e);
    }
  };
  input.click();
  input.remove();
}

/** 将当前 cookie 保存为文件 */
function export_cookies() {
  if (cookies.value.length === 0) {
    return ElMessage.warning("no cookies");
  }

  const useful_cookies: chrome.cookies.Cookie[] = [];
  for (const cookie of cookies.value) {
    if (!cookie.name || !cookie.value) continue;
    // 因为 MyCookie 包含了多余的信息，为了【兼容其它的插件】，所以应该导出标准格式的 cookie
    const c = format_mycookie(cookie);
    useful_cookies.push(c);
  }

  if (useful_cookies.length === 0) {
    return ElMessage.warning("no useful cookies");
  }

  const cookie_str = JSON.stringify(useful_cookies, null, 4);
  const blob = new Blob([cookie_str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cookies_${generate_id()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

//#endregion

//#region 事件处理

// 监听标签页刷新，重新获取对应的 cookie！
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    if (!tab.url) return;
    await refresh_cookies(tab.url);
  }
});

// 监听标签页切换，重新获取对应的 cookie！
chrome.tabs.onActivated.addListener(async activeInfo => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url) return;
  await refresh_cookies(tab.url);
});

//#endregion

function init_cookie_when_dev() {
  if (__IS_DEV_UI__) {
    cookies.value = [
      {
        domain: ".bilibili.com",
        expirationDate: 1774837503.210134,
        hostOnly: false,
        httpOnly: false,
        name: "buvid3",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "635C0D59-BB45-1944-5F35-B3F9D2C5F96602208infoc",
      },
      {
        domain: ".bilibili.com",
        hostOnly: false,
        httpOnly: false,
        name: "b_nut",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "1740277502",
      },
      {
        domain: ".bilibili.com",
        expirationDate: 1771813508,
        hostOnly: false,
        httpOnly: false,
        name: "_uuid",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "2AAADBC10-9337-1C10E-3EC6-563510A3FA97E08403infoc",
      },
      {
        domain: ".bilibili.com",
        expirationDate: 1789122093.447757,
        hostOnly: false,
        httpOnly: false,
        name: "buvid4",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value:
          "3F6E7A2B-895C-1A24-6B9C-1C633152308013359-025022302-1Mt9Ogwb5pxKDyF8l50Y6Q%3D%3D3F6E7A2B-895C-1A24-6B9C-1C633152308013359-025022302-1Mt9Ogwb5pxKDyF8l50Y6Q%3D%3D3F6E7A2B-895C-1A24-6B9C-1C633152308013359-025022302-1Mt9Ogwb5pxKDyF8l50Y6Q%3D%3D3F6E7A2B-895C-1A24-6B9C-1C633152308013359-025022302-1Mt9Ogwb5pxKDyF8l50Y6Q%3D%3D",
      },
      {
        domain: ".bilibili.com",
        expirationDate: 1774837516.603041,
        hostOnly: false,
        httpOnly: false,
        name: "rpdid",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "|(kmJY|~|lmR0J'u~R|k~~lul",
      },
    ];
    init_cookie_format(cookies.value);
    current_tab_url.value = "https://www.curemagic-this-is-a-test-origin.com/";
  }
}

/** 当第一次打开 side panel 时的操作 */
async function init_cookie() {
  // 获取当前 tab 的 cookie
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return;
  const tab_url = tabs[0]?.url;
  if (!tab_url) {
    return ElMessage.warning("no cookies on this page");
  }
  await refresh_cookies(tab_url);
}

onMounted(async () => {
  if (__IS_DEV_UI__) {
    init_cookie_when_dev();
  } else {
    await init_cookie();
  }
  check_screen_size();
  window.addEventListener("resize", debounce(check_screen_size, 200));
});
onUnmounted(() => {
  window.removeEventListener("resize", check_screen_size);
});
</script>

<style>
.one-cookie-item .el-descriptions__header {
  margin-bottom: 2px;
}

.one-cookie-item .cookie-value-style {
  /* 展示 cookie value 时，避免编辑它时出现【抖动】，所以将高度调整一点 */
  height: 50px;
}

:root {
  /* 底部控制条高度 */
  --control-bar-height: 80px;
}
</style>

<style scoped>
.cookies-body {
  /* 给底部控制条腾出空间，避免控制条遮住了内容 */
  margin-bottom: var(--control-bar-height);
  padding-bottom: 20px;
  overflow-x: overlay;
}

.one-cookie-item {
  margin-bottom: 5px;
}

.descriptions-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.clickable_cell {
  cursor: pointer;
  user-select: none;
  /* 增加可点击范围 */
  width: 100%;
  height: 100%;
}

.control-bar-container {
  display: flex;
  justify-content: center;

  position: fixed;
  /* 弥补 padding 的宽度 */
  margin-left: -20px;
  border-top: 2px solid var(--cure-idol);
  background-color: #121212;

  width: 100%;
  height: var(--control-bar-height);
  bottom: 0;

  z-index: 100;
}

.control-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 10px;
}

.control-btns {
  /* 当窗口变窄时，保持让按钮都一行排列，不会出现【挤压换行】 */
  display: flex;
}

/* 当浏览器宽度够宽时，底部按钮的宽度 */
.control-btns .el-button {
  width: 100px;
}

/* 当浏览器宽度变窄时，底部按钮的宽度 */
.narrow-bottom .el-button {
  /* 调试后确认的宽度 */
  max-width: 40px !important;
}

.tab-url-row {
  width: 90vw;
  display: flex;
  justify-content: center;
}

.tab-url-row .el-text {
  padding: 0 5px;
  color: var(--cure-kiss);
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
