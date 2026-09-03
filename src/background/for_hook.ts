/** 实现与 hook 功能的通信 */

import { CureLogger, hook_script_helper } from "@/shared";
import { hook_setting, extension_setting } from "@/shared/storage_manager";
import { is_ignore_tab } from "./tools";
import { listen_set_cookie } from "./for_popup";

const logger = new CureLogger("background/for_hook");

// #region 初始化注入hook代码

/** 整体注入逻辑，见 `doc/about_inject.md` 文档 */
(function init_inject_hook() {
  /** 记录 tab 页对应的 host 地址哟，注入 iframe 时可以找到其对应的标签页配置项
   * - 在 tab 页更新时，更新 host
   * - 在 tab 页删除时，移除
   */
  const TabToHost = new Map<number, string>();

  /** 注入 hook 代码到指定的 tab 页，如果传入 frameId 则是注入到指定的 frame 中。
   *
   * 同时也会注入配置项哟！
   *
   * @param just_setting 是否仅仅注入配置项，不注入 hook 代码。
   * 在注入到 iframe 中时，content-script 注入更快，此时仅需要注入配置项就可以了
   */
  async function inject_hook(
    tabId: number,
    setting: OneSettingItem,
    just_setting: boolean,
    frameId?: number,
  ) {
    try {
      const all_frames = frameId === undefined;

      // @ts-ignore
      const target: chrome.userScripts.InjectionTarget = {
        tabId,
        allFrames: all_frames,
        frameIds: all_frames ? undefined : [frameId],
      };

      // #cure-tip 先注入 hook 文件，然后注入初始化配置项的代码！
      const init_code = hook_script_helper.crate_hook_api_code(
        "init_all_setting",
        JSON.stringify(setting),
      );
      const js: chrome.userScripts.ScriptSource[] = [{ code: init_code }];
      !just_setting && js.unshift({ file: "/content/main.js" });

      await chrome.userScripts.execute({
        target,

        // @ts-ignore
        js,
        world: "MAIN",
        injectImmediately: true,
      });
    } catch (e) {
      logger.log_with_logo("error", "Inject Error", e);
    }
  }

  /** 获取对应标签页的配置项 —— 因为当前使用缓存机制，所以读取速度会很快！*/
  async function get_tab_hook_setting(tabId: number, tab_host: string) {
    const s = await hook_setting.get_setting(tab_host, tabId);
    // 开发模式下，默认开启 hook
    if (await extension_setting.get_setting("dev_mode")) {
      s.cure_setting.enable_hook = true;
      // 此处不需要重置底层的 enable_hook 值，因为这里仅仅是注入到网页中而已
      // 在后续检查网页 Hook 状态时再操作最好！
    }
    return s;
  }

  /** 根据配置项进行一些操作，比如如果监听 cookie 读写时需要开启监听等等 */
  async function action_on_setting(tabId: number, setting: OneSettingItem) {
    if (setting.cure_setting.enable_hook) {
      listen_set_cookie(tabId, setting.cure_setting.cookie || false);
    }
  }

  // #cure-tip 监听普通 tab 页刷新，注入 hook 代码
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading") {
      if (!tab.url || is_ignore_tab(tab.id, tab.url)) return;

      // 如果 tab.url 为 file:/// ，则 .host 属性可能为空哟
      const tab_host = new URL(tab.url).host || tab.url;
      TabToHost.set(tabId, tab_host);

      const setting = await get_tab_hook_setting(tabId, tab_host);
      await inject_hook(tabId, setting, false);
      await action_on_setting(tabId, setting);
    }
  });

  // #cure-tip 监听 iframe 刷新，注入 hook 代码
  chrome.webNavigation.onCommitted.addListener(async details => {
    const tabId = details.tabId;
    const url = details.url;
    if (is_ignore_tab(tabId, url)) return;

    const frameId = details.frameId;
    // 主页面，已经由 `tabs.onUpdated` 处理过了，无需重复处理
    if (frameId === 0) return;

    // 这里指定 host 为主 frame 的链接！
    const tab_host = TabToHost.get(tabId);
    if (tab_host) {
      const setting = await get_tab_hook_setting(tabId, tab_host);
      inject_hook(tabId, setting, false, frameId);
    }
  });

  chrome.tabs.onRemoved.addListener(tabId => {
    TabToHost.delete(tabId);
  });
})();

// #endregion

// #region 展示hook功能的开与关

// 当前标签页开启了 hook 功能时，在插件上显示一个小图标咯
(function show_hook_state() {
  // #cure-tip 监听 tab 页关闭 清空该 tabId 对应的 storage 咯
  chrome.tabs.onRemoved.addListener(async tabId => {
    await hook_setting.bind_tabId_with_name(tabId, "");
    logger.log_with_logo(
      "warn",
      "Tab Closed",
      "clear storage for tabId:",
      tabId,
    );
  });

  // #region 预定义常量

  /** hook 功能关闭时显示的文字 */
  const default_off_text = "";
  /** hook 功能开启时显示的文字 */
  const default_on_text = "Hook";
  /** hook 功能关闭时显示的背景颜色 */
  const default_off_bgcolor: chrome.extensionTypes.ColorArray = [0, 0, 0, 0];
  /** hook 功能开启时显示的背景颜色 */
  const default_on_bgcolor = "#FE5B9B";

  // #endregion

  // #region 辅助函数

  /** 当插件关闭功能时调用这个重置状态，不设置 tabId 表示对所有 tab 页有效 */
  async function off_state(tabId?: number) {
    await chrome.action.setBadgeText({ text: default_off_text, tabId });
    await chrome.action.setBadgeBackgroundColor({
      color: default_off_bgcolor,
      tabId,
    });
  }

  /** 当插件开启功能时调用这个重置状态，不设置 tabId 表示对所有 tab 页有效 */
  async function on_state(tabId?: number) {
    await chrome.action.setBadgeText({ text: default_on_text, tabId });
    await chrome.action.setBadgeBackgroundColor({
      color: default_on_bgcolor,
      tabId,
    });
  }

  /** 当标签页开启或关闭 hook 功能时，切换插件的状态
   * @param tab_id 标签页 id
   * @param tab_title 标签页标题
   * @param tab_host 标签页的 host 地址
   * @param enable_hook 为 false 表示关闭 hook 功能哟
   */
  async function toggle_hook_state(
    tab_id: number,
    tab_title: string,
    tab_host: string,
    enable_hook: boolean,
  ) {
    const suffix = `\n\t[tabId: ${tab_id}]\n\t[Title: ${tab_title}]\n\t[Url: ${tab_host}]`;

    if (enable_hook) {
      logger.log("<Start Hook>" + suffix);
      await on_state(tab_id);
    } else {
      logger.log("<Stop Hook>" + suffix);
      await off_state(tab_id);
    }
  }

  /** 当网页刷新时，检查该网页是否开启了 enable_hook 选项，并做出相应的设置 */
  async function check_enable_hook(tab: chrome.tabs.Tab) {
    const tabId = tab.id;
    if (tabId === undefined) return;

    // 从 storage 中读取 enable_hook 项的值，查看它是否开启了 hook 功能
    const tab_title = tab.title || "unkown title";
    const tab_host = new URL(tab.url as string).host || tab.url || "unkown url";
    let enable_hook = (await hook_setting.get_setting(tab_host, tabId))
      .cure_setting?.enable_hook;

    // #cure-tip 测试时启用hook 强制所有标签页开启hook
    if (await extension_setting.get_setting("dev_mode")) {
      await toggle_hook_state(tabId, tab_title, tab_host, true);
      // 不需要删除原本的 enable_hook 设置项，因为强制 Hook 之后这里仅仅是切换插件的状态，
      // 在其它地方会根据 dev_mode 进行判断
      logger.log_with_logo("warn", "Start With Dev Mode! Hook All Tabs");
      return;
    }

    // 默认情况下，网站是不开启 hook 功能的
    // 那么什么情况为 undefined 呢？网站开启了 Hook 功能，或者使用了某个命名的配置咯
    // 所以这里只需要处理 undefined 的情况即可 —— 说明启用 Hook 哟
    if (enable_hook === undefined) {
      enable_hook = true;
    }

    await toggle_hook_state(tabId, tab_title, tab_host, enable_hook);
  }

  //#endregion

  // #cure-tip 当页面刷新时 需要检查该标签页是否开启了hook，从而让插件切换状态
  chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading") {
      if (is_ignore_tab(tab.id, tab.url)) return;
      try {
        await check_enable_hook(tab);
      } catch (e) {
        logger.log_with_logo("error", "check enable hook error", e);
      }
    }
  });
})();

// #endregion
