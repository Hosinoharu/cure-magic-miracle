/** 关于当前 Tab 页的信息存储 */

import { hook_script_helper } from "@/shared";
import { ref } from "vue";
import { get_current_tab_info } from "./action";
import { defineStore } from "pinia";

export const useTabInfoStore = defineStore("tab_info", () => {
  /** 当前 Tab 页的 id */
  const _tabId = ref(0);
  /** 当前 Tab 页的 url 的 host */
  const _tab_host = ref("");

  /** 获取当前 tab 的信息，包括 tab 的 host url 和 tab id。失败则返回 undefined */
  async function get_currtab_info() {
    // 避免重复获取
    if (_tab_host.value === "" || _tabId.value === 0) {
      const res = await get_current_tab_info();
      _tabId.value = res.tabId;
      _tab_host.value = res.tab_host;
    }

    return { tabId: _tabId.value, tab_host: _tab_host.value };
  }

  /** 刷新当前 Tab 并重新加载插件
   * @param [ext=false] 为 true 表示同时还重新加载整个插件
   */
  async function reload_tab(ext = false) {
    const { tabId } = await get_currtab_info();
    hook_script_helper.call_cure_func({ tabId }, "reload");
    // 通知 bg 脚本，重新加载插件
    ext &&
      chrome.runtime.sendMessage({
        type: "reload",
        from: "popup",
      } as PCBMsgBody);
  }

  return {
    _tabId,
    _tab_host,
    get_currtab_info,
    reload_tab,
  };
});
