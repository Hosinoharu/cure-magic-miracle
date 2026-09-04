/** 关于插件自身的一些配置 */

import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { CureLogger } from "@/shared";
import { extension_setting } from "@/shared/storage_manager";

const cure_logger = new CureLogger("extension setting store");

/** 标记是否开始了初始化 */
let on_initialized = false;
/** 标记已经完成了初始化 */
let end_init = false;

export const useExtensionSettingStore = defineStore("extension_setting", () => {
  /** 记录当前的插件配置项咯 */
  const curr_extension_setting = reactive<Partial<ExtensionSetting>>({});
  const _last_setting = ref<Partial<ExtensionSetting>>({});

  async function init() {
    if (on_initialized) {
      return;
    }
    on_initialized = true;

    const setting = await extension_setting.get_all_settings();
    cure_logger.log_with_logo("init", "current extension_setting", setting);

    const s: Partial<ExtensionSetting> = {};
    for (const [key, value] of Object.entries(setting)) {
      // @ts-ignore
      s[key] = value;
    }
    _last_setting.value = s;
    Object.assign(curr_extension_setting, s);
    end_init = true;
  }

  // #cure-tip 监听配置项变动，实时保存到chrome.storage中并作用到网页中
  watch(curr_extension_setting, async (newValue: Partial<ExtensionSetting>) => {
    if (!end_init) return;

    // 找出哪些设置项被改动了，然后设置 chrome.storage
    for (const [key, value] of Object.entries(newValue)) {
      // @ts-ignore
      const old_kv = _last_setting.value[key];
      if (old_kv === undefined || old_kv !== value) {
        cure_logger.log_with_logo(
          "warn",
          "set extension_setting",
          key,
          "==>",
          value,
        );
        await extension_setting.set_setting(
          key as keyof ExtensionSetting,
          value,
        );
      }
    }
  });

  /** 发送消息，还原插件 */
  async function reset_extesion() {
    chrome.runtime.sendMessage({ type: "reset", from: "popup" } as PCBMsgBody);
  }

  return {
    _last_setting,
    curr_extension_setting,
    init,
    reset_extesion,
  };
});
