/** 定义和浏览器插件端的通信协议 */

/** 注入到网站中脚本暴露的 API 名称，便于统一限制 */
type HookScriptExposedAPIName =
  | "init_all_setting"
  | "change_cure_setting"
  | "reload";

// #region 插件发过来的 Hooker 配置项

type HookerSettingInnerOne = {
  /** 功能是否开启 */
  on: boolean;
  /** 对应的处理函数 */
  func: string;
};

type HookerSettingInner = {
  /** 配置 hooker log */
  log: HookerSettingInnerOne;
  /** 配置 hooker debugger */
  debugger_: HookerSettingInnerOne;
  /** 配置 hooker handler */
  handler: HookerSettingInnerOne;
};

/** Hook 的类型 */
type HookerType = "hook-property-value" | "hook-property" | "hook-method";

type OneHookerSetting = {
  /** 是否启用该 hook */
  on: boolean;
  /** 要 hook 的对象 */
  target: string;
  /** 要 hook 的属性 */
  property: string;
  /** hook 的描述信息，它将作为该配置项的 id 使用哟 */
  desc: string;
  /** hook 的类型 */
  type: HookerType;

  /** getter 配置 */
  getter?: HookerSettingInner;
  /** setter 配置 */
  setter?: HookerSettingInner;
  /** 处理函数参数 */
  call_param?: HookerSettingInner;
  /** 处理函数返回值 */
  call_return?: HookerSettingInner;
  /** 处理构造函数参数 */
  new_param?: HookerSettingInner;
  /** 处理构造函数返回值 */
  new_return?: HookerSettingInner;
  /** 函数处理 */
  call?: HookerSettingInnerOne;
  /** 构造函数处理 */
  new?: HookerSettingInnerOne;
};

/** `hooker` 的配置项 —— 比如配置 logger、debugger 之类的 */
type HookerSetting = { [settingId: string]: OneHookerSetting };

// #endregion
