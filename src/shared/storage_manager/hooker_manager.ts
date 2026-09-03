/** 操作 hooker 配置项 */
import { ExTopKVManager } from "../storage";

/** 抽象化所有关于 `hook` 配置项的操作 */
class HookSettingManager
  extends ExTopKVManager<PersistentStorageStructure, HOOKSetting>
  implements HOOKSettingAPI
{
  /** 每个标签页启动时默认的 hook 配置！
   * 也就是说，如果没有找到其配置项，就用这个默认的配置项！
   */
  readonly #default_hook_setting: OneSettingItem = {
    // 这个默认配置项影响到了 popup page 等展示哟，所以必须要在这里设置
    // 当然，在 cure-magic-core 中也会采取相同的默认配置项
    // 尤其注意 enbale_hook 在 cure-magic-core 中是默认为 true
    // 因为配置项注入到网站中还需要一段时间，这段时间中还是进行 Hook
    cure_setting: {
      // #cure-warn 注入 cure_debug 功能所需要的插件 id
      extension_id: chrome.runtime.id,
      /** 默认情况下不 hook 网页，需要手动开启或者强制 Hook */
      enable_hook: false,
      /** 默认情况下不输出，性能考虑。因为输出会调用 console.group、
       * json.stringify 等方法，性能开销较大
       */
      no_log: true,
      remove_debugger: true,
    },
    // #cure-tip 默认提供一些 API 的 hook 哟
    hooker_setting: {
      "JSON.stringify": {
        on: false,
        target: "JSON",
        property: "stringify",
        desc: "JSON.stringify",
        type: "hook-method",
        getter: {
          log: { on: false, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        setter: {
          log: { on: false, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call_param: {
          log: { on: true, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call_return: {
          log: { on: true, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call: { on: false, func: "" },
      },
      "JSON.parse": {
        on: false,
        target: "JSON",
        property: "parse",
        desc: "JSON.parse",
        type: "hook-method",
        getter: {
          log: { on: false, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        setter: {
          log: { on: false, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call_param: {
          log: { on: true, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call_return: {
          log: { on: true, func: "" },
          debugger_: { on: false, func: "" },
          handler: { on: false, func: "" },
        },
        call: { on: false, func: "" },
      },
    },
  };

  async get_setting_with_name(name: string) {
    await this.init();
    const v = this.temp.Saved.names[name];
    // 返回 v 的副本，并且要递归拷贝！
    return structuredClone(v);
  }

  async get_tabId_setting(tabId: number) {
    await this.init();
    let v: OneSettingItem | undefined;
    const r = this.temp.Tab[tabId];
    // 该 tab 的配置项是命名的！
    if (typeof r === "string") {
      v = await this.get_setting_with_name(r);
    } else {
      v = r;
    }
    // 此处不需要保存默认配置到 Tab 中。因为如果其它地方不进行 `设置新的配置项`，
    // 那么不保存该配置项根本不影响 —— 反正得到的配置项是相同的
    // 但一旦有地方设置了配置项，就会读取本默认配置项进行覆盖，然后保存哟
    return v ? structuredClone(v) : this.get_default_setting();
  }

  async get_host_setting(host: string) {
    await this.init();
    let v: OneSettingItem | undefined;
    const r = this.temp.Saved.hosts[host];
    if (typeof r === "string") {
      v = await this.get_setting_with_name(r);
    } else {
      v = r;
    }
    return v ? structuredClone(v) : v;
  }

  async get_target_setting_name(tabId_or_host: number | string) {
    await this.init();
    let r: string | undefined;
    if (typeof tabId_or_host === "number") {
      const v = this.temp.Tab[tabId_or_host];
      if (typeof v === "string") {
        r = v;
      }
    } else {
      r = this.temp.Saved.hosts[tabId_or_host];
    }
    return r;
  }

  /** 获取所有已经命名的配置项的名字哟 */
  async get_all_setting_names() {
    await this.init();
    return Object.getOwnPropertyNames(this.temp.Saved.names);
  }

  get_default_setting() {
    // 需要返回副本啦！
    return structuredClone(this.#default_hook_setting);
  }

  async del_setting_with_name(name: string) {
    this.logger.log_with_logo("del", `setting [${name}]`);
    delete this.temp.Saved.names[name];
    await this.save();
  }

  async save_target_setting(tabId: number, name: string) {
    await this.init();
    const s = await this.get_tabId_setting(tabId);
    // 如果 tabId 的配置项不存在，则返回
    if (s === undefined) {
      this.logger.log_with_logo(
        "warn",
        `save name [${name}] failed`,
        `Tab [${tabId}] not found in TabSetting.`,
      );
      return;
    }
    // 如果名称已经存在，则覆盖
    if (this.temp.Saved.names[name]) {
      this.logger.log_with_logo("warn", `Overried SavedSetting [${name}]`);
    } else {
      this.logger.log_with_logo(
        "set",
        `tabId [${tabId}] setting with name [${name}]`,
        s,
      );
    }
    this.temp.Saved.names[name] = s;
    await this.save();
  }

  /** 取消绑定的时候，会将命名配置项暂时保留到该 tab 中，不会完全删除哟 */
  async bind_tabId_with_name(tabId: number, name: string) {
    await this.init();
    if (name === "") {
      this.logger.log_with_logo("del", `tabId [${tabId}]`);
      const name = this.temp.Tab[tabId];
      delete this.temp.Tab[tabId];
      // 获取命名配置项内容并保存到当前 tab
      if (typeof name === "string") {
        const s = await this.get_setting_with_name(name);
        this.temp.Tab[tabId] = s;
      }
    } else {
      this.logger.log_with_logo(
        "set",
        `tabId [${tabId}] with name setting [${name}]`,
      );
      this.temp.Tab[tabId] = name;
    }
    await this.save();
  }

  /** 取消绑定的时候，将真的完全删除，不会进行保留哟 */
  async bind_host_with_name(host: string, name: string) {
    await this.init();
    if (name === "") {
      this.logger.log_with_logo("del", `host [${host}] setting`);
      delete this.temp.Saved.hosts[host];
    } else {
      this.logger.log_with_logo(
        "set",
        `host [${host}] with name setting [${name}]`,
      );
      this.temp.Saved.hosts[host] = name;
    }
    await this.save();
  }

  async get_setting(host: string, tabId: number) {
    await this.init();
    // 如果该 host 有绑定的 name，这这说明该 tab 标签页其实和该 host 在同一个网页
    // 那么，说明该 tab 使用的配置项也是命名的咯，此时需要给该 tab 绑定哟
    const name = await this.get_target_setting_name(host);
    // 有命名配置项时需要先绑定到当前 tab，然后返回该命名配置项
    if (typeof name === "string" && name !== "") {
      await this.bind_tabId_with_name(tabId, name);
      const r = await this.get_setting_with_name(name);
      if (r) return structuredClone(r);
    }
    return await this.get_tabId_setting(tabId);
  }

  async set_cure_setting(
    tabId: number,
    key: keyof CureSetting,
    value: string | number | boolean,
  ) {
    await this.init();
    // 先获取其配置项
    const s = await this.get_tabId_setting(tabId);
    // 设置的值如果是假值，则是删除该属性！
    if (!value) {
      delete s.cure_setting[key];
    } else {
      // @ts-ignore
      s.cure_setting[key] = value;
    }

    // 看看它是否为命名配置项！
    const name = await this.get_target_setting_name(tabId);
    if (name) {
      // 需要直接设置该命名配置项哟
      this.temp.Saved.names[name] = s;
    } else {
      this.temp.Tab[tabId] = s;
    }

    this.logger.log_with_logo(
      "set",
      `tabId [${tabId}] cure_setting`,
      key,
      "==>",
      value,
    );
    await this.save();
  }

  async set_hooker_setting(setting_name: string, value: HookerSetting) {
    await this.init();
    const target = this.temp.Saved.names[setting_name];
    if (target) {
      target.hooker_setting = value;
      this.logger.log_with_logo(
        "set",
        `setting [${setting_name}] hooker_setting`,
        "==>",
        value,
      );
      await this.save();
    }
  }
}

const default_setting: HOOKSetting = {
  Tab: {},
  Saved: { names: {}, hosts: {} },
};
/** 操作 `hook` 配置项 */
export const hook_setting = new HookSettingManager(
  "hook setting",
  "HOOK",
  default_setting,
  true,
).listen();
