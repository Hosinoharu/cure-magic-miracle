/** 使用 chrome.storage 存储数据时的类型约束。*/

//#region 插件存储的整体结构

/** 持久化存储的结构 —— 浏览器重启后依然存在的情况 */
type PersistentStorageStructure = {
  /** 关于网页 Hook 的配置项 */
  HOOK: HOOKSetting;
  /** 插件自身的配置项 */
  Extension: ExtensionSetting;
  /** 浏览器代理相关的配置 */
  NetProxy: NetProxySetting;
};
/** 持久化存储有哪些变量哟 */
type PersistentVariables = keyof PersistentStorageStructure;

//#endregion

/** 操作配置项时的通用 API。
 *
 * **任何读写配置项的操作时**，
 * - 应该调用 `init` 尝试初始化，
 * - 然后访问 `_temp.xx` 读写、修改配置项
 * - 修改配置项之后，需要调用 `save` 来保证配置项被保存
 * - 监听配置项修改（始终获取最新的配置项），实时更新 `_temp`
 */
interface ExVariableManagerAPI {
  /** 获取当前的配置项 */
  init(): Promise<void>;
  /** 将当前缓存的配置项存储到 chrome.storage 中 */
  save(): Promise<void>;
  /** 监听 chrome.storage 的变化，用于更新缓存 */
  listen(): this;
  /** 停止监听 chrome.storage 的变化，某些情况下访问某个设置项的只有当前位置，自然不需要监听咯 */
  stop_listen(): this;
}

// #region Hook配置项的存储结构

type HOOKSetting = {
  /** 保存关于标签页的 Hook 信息 */
  Tab: TabHookSetting;
  /** 保存下来的 Hook 信息 */
  Saved: SavedHookSetting;
};

/** 表示当前配置项是作用于当前标签页、还是当前网站哟 */
type HOOKSettingMode = "Tab" | "Host";

type OneUIHookerSetting = OneHookerSetting & {
  /** 是否显示配置项 */
  show: boolean;
};

/** 存储配置项的基本单位 */
type OneSettingItem = {
  /** 开启了哪些预定义的功能 */
  cure_setting: Partial<CureSetting>;
  /** 配置 hooker */
  hooker_setting: Partial<HookerSetting>;
};

/** 存储 Tab 页的配置，它的 key 是 tabId，value 可以是某个命名的配置项 */
type TabHookSetting = { [tabId: number]: OneSettingItem | string | undefined };

/** 存储的命名配置项 */
type SavedHookSetting = {
  /** 命名配置项的名称 */
  names: { [name: string]: OneSettingItem | undefined };
  /** 记录网站对应的配置项名称 */
  hosts: { [host: string]: string | undefined };
};

/** 操作 hook setting 的 API，任何修改配置项的 API 都要同步到 storage 中哟*/
interface HOOKSettingAPI extends ExVariableManagerAPI {
  // 配置项的命名等操作
  /** 获取某个 tabId 的配置项。如果其不存在，则返回默认的配置项 */
  get_tabId_setting(tabId: number): Promise<OneSettingItem>;
  /** 获取某个 host 的配置项。如果配置项不存在，则不返回默认配置项哟 */
  get_host_setting(host: string): Promise<OneSettingItem | undefined>;
  /** 返回一个默认的配置项，也就是所有**网站的默认配置项** */
  get_default_setting(): OneSettingItem;
  /** 根据网站 host、标签页 tabid 查找配置项，如果没找到就返回默认的配置项 */
  get_setting(host: string, tabId: number): Promise<OneSettingItem>;

  /** 传入 tabId、tab_host，获取它的配置项名字 —— 如果有的话 */
  get_target_setting_name(
    tabId_or_host: number | string,
  ): Promise<string | undefined>;
  /** 获取所有命名配置项的名称 */
  get_all_setting_names(): Promise<string[]>;
  /** 将当前 tabId 的配置项命名保存，名称重复则覆盖！ */
  save_target_setting(tabId: number, name: string): void;
  /** 获取某个命名配置项的内容 */
  get_setting_with_name(name: string): Promise<OneSettingItem | undefined>;
  /** 删除某个命名配置项 */
  del_setting_with_name(name: string): void;

  /** 将 tabId 的配置项改为某个命名配置项。如果 `name` 为空字符串则解除关系 —— 即删除该配置项 */
  bind_tabId_with_name(tabId: number, name: string): void;
  /** 配置映射关系，该网站使用某个命名配置项。如果 `name` 为空字符串则解除关系 —— 即删除该配置项 */
  bind_host_with_name(host: string, name: string): void;

  // 写入，主要操作缓存,根据要写入的数据不同，所以有多个 API

  /** 修改标签页的 cure_setting。
   *
   * - 如果该标签页使用了命名的配置项，则会修改该命名配置项的 cure_setting！
   * - 如果多个网站使用同一个命名配置项时，造成的影响比较大，需要重新刷新网页！
   *
   * 修改之后需要更新 `chrome.storage` 中的数据，以进行同步
   */
  set_cure_setting(
    tabId: number,
    key: keyof CureSetting,
    value: string | number | boolean,
  ): void;
  /** 保存 hooker setting. 传入名称和对应的值即可啦。*/
  set_hooker_setting(setting_name: string, value: HookerSetting): Promise<void>;
}

// #endregion Hook配置项的存储结构

// #region 插件自身的存储结构

/** 存储插件自身的配置项 */
type ExtensionSetting = {
  /** 是否开启开发模式 —— 为 true 表示 Hook 所有网页 */
  dev_mode: boolean;
};

/** 操作插件自身配置项的 API */
interface ExtensionSettingAPI extends ExVariableManagerAPI {
  /** 获取一个配置项
   * @param default_value 如果该配置项不存在，就返回这个值
   */
  get_setting<K extends keyof ExtensionSetting>(
    key: K,
  ): Promise<ExtensionSetting[K]>;
  /** 设置一个配置项。如果设置为空值，则删除该配置项 */
  set_setting<K extends keyof ExtensionSetting>(
    key: K,
    value: ExtensionSetting[K] | undefined,
  ): void;
  /** 获取完整的插件配置项 */
  get_all_settings(): Promise<ExtensionSetting>;
}

// #endregion 插件自身的存储结构

// #region 浏览器代理的配置

/** 存储浏览器代理的配置 */
type NetProxySetting = {
  /** 存储的服务器的配置 */
  server: { [name: string]: ProxyServerSetting };
  /** 存储的代理配置 */
  proxy: { [name: string]: OneProxySettingRow };
  /** 当前正使用的代理名称 */
  current_proxy: string;
};

interface NetProxySettingAPI extends ExVariableManagerAPI {
  /** 添加一个空的服务器配置项，返回它的 settingId */
  add_empty_server(): Promise<ProxyServerSetting>;
  /** 添加一个 proxy server。如果没有传入服务器配置，则表示**删除该现有的服务器配置** */
  set_server(settingId: string, server?: ProxyServerSetting): Promise<void>;
  /** 获取一个 proxy server 的配置 */
  get_server(settingId: string): Promise<ProxyServerSetting | undefined>;
  /** 获取所有 proxy server 的配置。如果没有，则创建一个默认的配置项保存以便于编辑 */
  get_all_servers(): Promise<ProxyServerSetting[]>;
  /** 添加一个空的服务器配置项，返回它的 settingId */
  add_empty_proxy(): Promise<OneProxySettingRow>;
  /** 添加一个代理配置。如果没有传入代理配置，则表示**删除该现有的代理配置** */
  set_proxy(settingId: string, proxy?: OneProxySettingRow): Promise<void>;
  /** 获取一个代理配置 */
  get_proxy(settingId: string): Promise<OneProxySettingRow | undefined>;
  /** 获取所有代理配置。如果没有，则创建一个默认的配置项保存以便于编辑 */
  get_all_proxies(): Promise<OneProxySettingRow[]>;
  /** 设置当前使用的代理。不传入名字则是清空它！ */
  set_current_proxy(settingId?: string): Promise<void>;
  /** 获取当前使用的代理 */
  get_current_proxy(): Promise<string>;
}

// #endregion
