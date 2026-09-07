/** 一个共享的工具函数 */

import { nextTick } from "vue";

/** 添加一行数据之后，滚动到底部，以方便编辑该行 */
export async function scroll_to_bottom() {
  await nextTick();
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

/** 用于配置项生成 id */
export function generate_id() {
  return Date.now() + "_" + crypto.randomUUID().substring(0, 8);
}
