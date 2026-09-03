/** 本文件仅用于开发 ui 时使用。
 *
 * 即在不安装浏览器插件到浏览器中的情况下，开发 popup 等页面的 ui，
 * 相当于独立开发一个普通网页。相关 chrome API 被禁用，使用模拟数据代替。
 *
 */

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import path from "path";

const dirname = import.meta.dirname;

/**
 * 用法 `vite --mode <value>`
 *
 * mode 为 `popup` 表示开发 chrome 插件的 popup page
 */
export default defineConfig(({ mode, command }) => {
  if (command === "build") throw new Error("vite.config.ts only for dev mode");

  let input;

  switch (mode) {
    case "popup":
      input = "./src/popup/index.html";
      break;
    default:
      throw new Error("unknown mode value: " + mode);
  }

  const types = path.join(dirname, "src/types");

  return {
    base: "./",
    root: path.dirname(input),
    define: {
      /** 用于标记当前正处于调试 ui，此处应该保持为 true */
      __IS_DEV_UI__: true,
      /** 标记当前是否要生成 firefox 版本 */
      __IS_FIREFOX__: false,
      __BUILD_TIME__: `"${get_time()}"`,
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        dts: path.join(types, "element-plus-auto-imports.d.ts"),
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: path.join(types, "element-plus-components.d.ts"),
      }),
    ],
    build: {
      rolldownOptions: {
        input,
      },
      write: false,
    },
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
  };
});

function get_time() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  return `${year}-${month}-${date} ${hour}:${minute}:${second}`;
}
