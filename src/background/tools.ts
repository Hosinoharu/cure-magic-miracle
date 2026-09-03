/** 一些工具函数 */

/** 获取当前活动标签页的 tabId，没有则返回 0 */
export async function get_current_tabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return 0;
  const tabId = tabs[0]!.id;
  if (tabId === undefined) return 0;
  return tabId;
}

/** 注入代码时，忽略一些特殊的 url，如 `chrome://` 等 */
function is_ignore_url(url: string) {
  const is_chrome = url.startsWith("chrome://") || url.startsWith("edge://");
  if (is_chrome) return true;

  const is_extension =
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge-extension://");
  if (is_extension) return true;

  if (url.startsWith("chrome-untrusted://")) return true;

  // 开发者工具界面
  if (url.startsWith("devtools://")) return true;
  if (url.startsWith("https://msedgedevtools")) return true;

  return false;
}

/** 是否应该忽略掉注入到某个标签页 */
export function is_ignore_tab(tabId?: number, url?: string) {
  if (url && is_ignore_url(url)) return true;

  if (tabId && tabId === chrome.tabs.TAB_ID_NONE) return true;

  return false;
}

/** 根据网站 host 找出对应的标签页 id */
export async function get_tabId_by_host(host: string) {
  const tabIds: number[] = [];

  for (const tab of await chrome.tabs.query({})) {
    if (is_ignore_tab(tab.id, tab.url)) continue;
    const tab_host = new URL(tab.url!).host;
    // 忽略 file:/// 情况 因为它没有 host
    if (tab_host === host) {
      tabIds.push(tab.id!);
    }
  }

  return tabIds;
}

/** 根据标签页 id，获取它的 host。会忽略一些特殊网站 */
export async function get_host_by_tabId(tabId: number) {
  const tab = await chrome.tabs.get(tabId);
  if (is_ignore_tab(tab.id, tab.url)) return "";
  return new URL(tab.url!).host;
}
