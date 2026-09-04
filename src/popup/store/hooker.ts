/** 关于 cure_setting 配置项的存储 */

import { defineStore } from "pinia";
import { reactive, ref, watch, toRaw } from "vue";
import { CureLogger, hook_script_helper } from "@/shared";
import { hook_setting, extension_setting } from "@/shared/storage_manager";
import { action_on_setting } from "./action";
import { useTabInfoStore } from "./tab";
import { debounce } from "lodash-es";
import { ElMessage } from "element-plus";

const cure_logger = new CureLogger("cure setting store");

/** 标记是否开始了初始化 */
let on_initialized = false;
/** 标记已经完成了初始化 */
let end_init = false;

export const useCureSettingStore = defineStore("cure_setting", () => {
  /** 记录当前的 cure_setting 配置项 */
  const curr_cure_setting = reactive<Partial<CureSetting>>({});
  /** 记录上一次的 curr_cure_setting，从而计算出哪些属性进行了变动 */
  const _last_setting = ref<Partial<CureSetting>>({});
  const dev_mode = ref(false);

  async function init() {
    if (on_initialized) {
      return;
    }
    on_initialized = true;

    const tab_info_store = useTabInfoStore();
    const { tabId, tab_host } = await tab_info_store.get_currtab_info();
    // 获取当前 tab 标签页设置了的配置项 —— 仅针对 cure_setting 哟
    const setting = (await hook_setting.get_setting(tab_host, tabId))
      .cure_setting;
    // 强制 hook 模式下，enable_hook 必须为 true
    if (await extension_setting.get_setting("dev_mode")) {
      dev_mode.value = true;
      setting.enable_hook = true;
    }
    cure_logger.log_with_logo("init", "current cure_setting", setting);

    // 需要复制到 curr_cure_setting 中，并且不能触发 watch 哟
    const s: Partial<CureSetting> = {};
    // key 就是元素的 id、value 就是元素的值咯
    for (const [key, value] of Object.entries(setting)) {
      // @ts-ignore
      s[key] = value;
    }
    _last_setting.value = s;
    Object.assign(curr_cure_setting, s);
    end_init = true;
  }

  async function watch_cure_setting(newValue: Partial<CureSetting>) {
    if (!end_init) {
      return;
    }

    const tab_info_store = useTabInfoStore();
    const { tabId } = await tab_info_store.get_currtab_info();

    cure_logger.log(
      "[vue watch] cure_setting changed, new value:",
      toRaw(newValue),
      "\n\tlast:",
      toRaw(_last_setting.value),
    );

    // 找出哪些设置项被改动了，然后设置 chrome.storage
    for (const [key, value] of Object.entries(newValue)) {
      // @ts-ignore
      const old_kv = _last_setting.value[key];
      if (old_kv === undefined || old_kv !== value) {
        let _value = value;
        // 对于输入类型的设置，此时的 value 值为空字符串呐！虽然 '' 相当于是数字 0
        if (typeof old_kv === "number" && value === "") {
          _value = 0;
        }
        cure_logger.log_with_logo("set", "cure_setting", key, "==>", _value);
        await hook_setting.set_cure_setting(
          tabId,
          key as keyof CureSetting,
          _value,
        );
        // 注入到网页中！此处不能使用 await！！当网页已经断点，那么此处调用就会被卡住！
        // 因为是立即注入嘛，现在网站断点了，可不就注入的代码也被卡住了！
        hook_script_helper.change_cure_setting(tabId, key, _value);

        // #cure-tip 针对某些特殊设置项，需要额外处理
        if (!(await action_on_setting(key as keyof CureSetting, _value))) {
          ElMessage.error(`设置 ${key} 之后的处理出错哟~~`);
        }
      }
    }

    // 需要创建 value 的副本才可行
    _last_setting.value = { ...newValue };
  }

  // #cure-tip 监听配置项变动，实时保存到chrome.storage中并作用到网页中
  watch(curr_cure_setting, debounce(watch_cure_setting, 300));

  /** 还原所有 cure_setting 配置 —— 但保留 enable_hook 的状态 */
  async function reset_cure_setting() {
    // 所有干脆将属性值都赋值为 undefined，从而实现删除
    for (const [key, value] of Object.entries(curr_cure_setting)) {
      if (key === "enable_hook") {
        continue;
      }

      // 来一个好一点的赋值
      let result;
      if (typeof value === "boolean") {
        result = false;
      } else if (typeof value === "number") {
        result = 0;
      } else {
        result = "";
      }

      // @ts-ignore
      curr_cure_setting[key] = result;
    }

    // 从默认配置项中取值进行初始化咯
    const default_setting = hook_setting.get_default_setting();
    for (const [key, _value] of Object.entries(default_setting.cure_setting)) {
      if (key !== "enable_hook") {
        // @ts-ignore
        curr_cure_setting[key] = default_setting.cure_setting[key];
      }
    }
  }

  /** 获取当前网站/标签页是否有【命名的配置项】*/
  async function get_setting_name() {
    const result: {
      /** 当前配置项的名称 */
      name: string;
      /** 该配置项作用的范围。是当前的标签页还是网站 */
      mode: HOOKSettingMode;
    } = { name: "", mode: "Tab" };

    const { tabId, tab_host } = await useTabInfoStore().get_currtab_info();
    // 先查看网站 host
    const r1 = await hook_setting.get_target_setting_name(tab_host);
    if (r1) {
      result.name = r1;
      result.mode = "Host";
    } else {
      // 再查看当前标签页
      const r2 = await hook_setting.get_target_setting_name(tabId);
      if (r2) {
        result.name = r2;
      }
    }
    return result;
  }

  /** 保存当前配置项为某个名字 */
  async function save_setting_with_name(name: string) {
    const tab_info_store = useTabInfoStore();
    const { tabId } = await tab_info_store.get_currtab_info();
    cure_logger.log_with_logo("set", "save current setting with name:", name);
    // 保存当前配置并命名
    await hook_setting.save_target_setting(tabId, name);
  }

  /** 绑定 tab 或 host 到指定名字，如果传入名称为空字符串，则取消这种绑定 */
  async function bind_to_setting_name(name: string, mode: HOOKSettingMode) {
    const tab_info_store = useTabInfoStore();
    const { tabId, tab_host } = await tab_info_store.get_currtab_info();
    if (mode === "Tab") {
      await hook_setting.bind_tabId_with_name(tabId, name);
    } else {
      await hook_setting.bind_host_with_name(tab_host, name);
    }
  }

  /** 获取配置项的所有名称 */
  async function get_all_setting_names() {
    const r = await hook_setting.get_all_setting_names();
    cure_logger.log_with_logo("get", "all setting names:", r);
    return r;
  }

  /** 删除一个命名配置项 */
  async function delete_one_setting(name: string) {
    if (!name) return;
    cure_logger.log_with_logo("del", "setting:", name);
    await hook_setting.del_setting_with_name(name);
  }

  return {
    _last_setting,
    curr_cure_setting,
    dev_mode,
    init,
    reset_cure_setting,
    save_setting_with_name,
    bind_to_setting_name,
    get_setting_name,
    get_all_setting_names,
    delete_one_setting,
  };
});
