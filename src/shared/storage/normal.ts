/* eslint-disable @typescript-eslint/no-explicit-any */

/** 定义一些通用函数便于处理 */

// #region 读写 local storage

/** 读取某个存储项。传入 undefined 则获取所有配置项！ */
export async function get_storage(key: any) {
  const res: any = await chrome.storage.local.get(key);
  return key === undefined ? res : res[key];
}

/** 删除某个存储项 */
export async function remove_storage(key: any) {
  await chrome.storage.local.remove(key);
}

/** 写入某个存储项 */
export async function set_storage(key: any, value: any) {
  await chrome.storage.local.set({ [key]: value });
}

// #endregion

// #region 读写 session storage

/** 读取临时缓存，即 chrome.storage.session */
export async function get_temp_storage(key: any) {
  const res: any = await chrome.storage.session.get(key);
  return key === undefined ? res : res[key];
}

/** 删除临时缓存 */
export async function remove_temp_storage(key: any) {
  await chrome.storage.session.remove(key);
}

/** 写入某个存储项到临时存储 */
export async function set_temp_storage(key: any, value: any) {
  await chrome.storage.session.set({ [key]: value });
}

// #endregion

/** 清空所有存储 */
export async function clear_storage() {
  console.warn("Clear all storage!!!");
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
}

/** 输出存储的内容 */
export async function show_storage() {
  const res = await get_storage(undefined);
  console.log("[The Local Storage Structure]", res);

  const res2 = await get_temp_storage(undefined);
  console.log("[The Session Storage Structure]", res2);
}
