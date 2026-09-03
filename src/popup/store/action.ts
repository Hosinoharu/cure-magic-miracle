/** 进行解耦。一些配置项在变动时会触发一些操作，
 * 这些操作通常和页面 UI 无关，涉及到插件层面，如进行通信等等。
 * 这些操作逻辑就定义在这里吧
 */

/** 当某个 cure setting 配置项变动时进行调用。返回 true 表示操作成功！ */
export async function action_on_setting(
  key: keyof CureSetting,
  value: string | boolean | number,
) {
  let ok = true;
  switch (key) {
    case "cookie":
      ok = await listen_set_cookie(value as boolean);
      break;
    default:
      break;
  }
  return ok;
}

/** 当启用/关闭【监控 cookie】时，发送消息监听响应头中的 set-cookie 啦*/
async function listen_set_cookie(on: boolean) {
  let ok = true;
  try {
    const { tabId } = await get_current_tab_info();
    const msg: PCBMsgBodyListenSetCookie = {
      type: "listen-set-cookie",
      from: "popup",
      data: { on, tabId },
    };
    chrome.runtime.sendMessage(msg);
  } catch (e) {
    console.error("[listen_set_cookie error]", e);
    ok = false;
  }
  return ok;
}

/** 获取当前 tab 的信息，包括 tab 的 host url 和 tab id。失败则返回 undefined */
export async function get_current_tab_info() {
  const res = await chrome.tabs.query({ active: true, currentWindow: true });
  if (res.length === 0) {
    throw new Error("Failed to get current tab info.");
  }

  const tabId = res[0]!.id || 0;
  if (tabId === undefined) {
    throw new Error("Get current tab id is undefined.");
  }

  const url = res[0]!.url;
  const tab_host = url ? new URL(url).host : "";

  return { tabId, tab_host };
}
