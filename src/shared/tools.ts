/* eslint-disable @typescript-eslint/no-explicit-any */
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

/** 在使用 vue watch 监听对象变化时，需要手动维护一个 old value！非常麻烦，每次都要自己写，所以**这是实践之后抽离出来的重复逻辑**
 * @param init_value 用于初始的 old value
 * @param callback 当配置项变化时，执行的回调函数，通用来说：
 * - 如果 value 不为 undefined，则是新增数据
 * - 如果 value 为 undefined，则是删除数据
 *
 * 内部的逻辑是：以 `settingId` 为 key，将对象整体用 `JSON.stringify` 转换为字符串，进行记录。
 * 即转存为 `string --> string` 的形式。
 *
 * 然后和上一次的 old_value 进行比较，如果不同则执行回调函数。
 */
export function create_setting_watcher<
  T extends Array<{ [settingId: string]: any }>,
>(
  init_value: T,
  callback: (settingId: string, new_value?: any) => Promise<void>,
) {
  let old_value: { [settingId: string]: string } = {};
  for (const item of init_value) {
    // @ts-ignore
    old_value[item.settingId] = JSON.stringify(item);
  }

  return async function setting_watcher(new_value: T) {
    /** 代码优化的结果，避免进行两次循环遍历 */
    const _temp_value: { [settingId: string]: string } = {};
    for (const p of new_value) {
      const settingId = p.settingId;
      const last_value = old_value[settingId]; // 旧配置项
      const new_value = JSON.stringify(p); // 新配置项
      _temp_value[settingId] = new_value;

      // 该配置项是新增的、或者该配置项有变动，直接更新
      if (last_value === undefined || last_value !== new_value) {
        await callback(settingId, p);
      }

      delete old_value[settingId];
    }

    // 现在，如果还有值，说明这些配置项被删除了
    for (const id of Object.keys(old_value)) {
      await callback(id);
      delete old_value[id];
    }

    old_value = _temp_value;
  };
}
