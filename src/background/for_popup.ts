/** 处理和 popup page 的通信 */

import { CureLogger, clear_storage } from "@/shared";

const logger = new CureLogger("background/for_popup");

/** 记录哪些标签页需要监听 set-cookie */
const listen_set_cookie_tabs: Set<number> = new Set();

chrome.runtime.onMessage.addListener(
  async (request: PCBMsgBody, _sender, _sendResponse) => {
    if (request.from !== "popup") return;
    switch (request.type) {
      case "reload":
        chrome.runtime.reload();
        break;
      case "reset":
        await clear_storage();
        chrome.runtime.reload();
        break;
      case "listen-set-cookie":
        const r = request as PCBMsgBodyListenSetCookie;
        listen_set_cookie(r.data.tabId, r.data.on);
        break;
      default:
        logger.log_with_logo("error", "unknown type", request.type);
        break;
    }
  },
);

/** 监听标签页的 set-cookie
 * @param on 是否开启监听
 */
export function listen_set_cookie(tabId: number, on: boolean) {
  if (on) {
    if (listen_set_cookie_tabs.has(tabId)) return;

    logger.log_with_logo("set", "listen_set_cookie", tabId);
    listen_set_cookie_tabs.add(tabId);

    // 有目标了，就添加事件！只添加一次，监听全部！
    if (listen_set_cookie_tabs.size === 1) {
      logger.log("[Add Listener] listen_set_cookie");
      chrome.webRequest.onHeadersReceived.addListener(
        listen_set_cookie_handler,
        { urls: ["<all_urls>"] },
        ["responseHeaders", "extraHeaders"],
      );
    }
  } else {
    const ok = listen_set_cookie_tabs.delete(tabId);
    // 当没有网站监听的时候，就删除监听器
    if (ok && listen_set_cookie_tabs.size === 0) {
      logger.log("[Remove Listener] listen_set_cookie");
      chrome.webRequest.onHeadersReceived.removeListener(
        listen_set_cookie_handler,
      );
    }
  }
}

/** onHeadersReceived 的事件处理函数，
 * 监听某个标签页请求的 set-cookie，返回发送给 content 脚本输出。
 * 单独拿出来是为了方便后面取消该事件哟。
 */
function listen_set_cookie_handler(
  details: chrome.webRequest.OnHeadersReceivedDetails,
): undefined {
  if (details.tabId === -1 || !listen_set_cookie_tabs.has(details.tabId))
    return;

  const headers = details.responseHeaders;
  if (headers === undefined) return;

  const cookie: string[] = [];
  for (const h of headers) {
    if (h.name.toLowerCase() === "set-cookie" && h.value) {
      cookie.push(h.value);
    }
  }

  if (cookie.length === 0) return;

  const msg: PCCMsgBodySetCookie = {
    type: "set-cookie",
    data: {
      url: details.url,
      cookie,
    },
  };

  chrome.tabs.sendMessage(details.tabId, msg);
}

// 监听 tab 页关闭 删除对它的 set-cookie 监听咯
chrome.tabs.onRemoved.addListener(async tabId => {
  listen_set_cookie(tabId, false);
});
