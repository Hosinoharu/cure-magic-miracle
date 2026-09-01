/** 根据新的通信规范，`popup、background` 等利用
 * `scripting api` 发送消息过来时，可以调用这些 API。
 */

import cure_console from "../cure-console";
import cure_share from "../cure-share";
import { cure_setting } from "../cure-settings";
import { curedebug } from "./normal";

const raw_setTimeout = setTimeout;
/** 刷新当前网页的 API，仅在 window 中可以调用哟 */
const raw_reload_page =
  cure_share.current_cure_scope === "Window"
    ? cure_share.ElseFunc.bind(location.reload, location)
    : () => {};

/** 记录设置项是否初始化完成 */
let is_initialized = false;
/** 标记正在进行初始化，避免插件和 hooker 同时配置项！
 *
 * 对于 `iframe`，如果是 js 创建的，则会在访问 `contentWindow` 时触发 hooker 的初始化.
 * 而插件也会注入配置项，为了避免重复注入，所以使用该标记当前正在初始化中。
 */
let initializing = false;

/** 判断设置项是否初始化完成 */
export function initialized() {
  return is_initialized;
}

/** 过 1s 后刷新网页 */
export function reload() {
  raw_setTimeout(raw_reload_page, 1000);
}

export function init_all_setting(s: AllSetting) {
  if (is_initialized || initializing) return;
  initializing = true;

  const enable_hook = s.cure_setting.enable_hook;
  // 单独取出该设置项，主要是为了在最后面发送。默认为 false
  const debug_after_init =
    s.cure_setting.debug_after_init === undefined
      ? false
      : s.cure_setting.debug_after_init;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete s.cure_setting.debug_after_init;

  init_cure_setting(s.cure_setting);
  enable_hook && init_hooker_setting(s.hooker_setting);

  // 必须发送该消息，它标志着 hook 配置项的初始化完成哟
  change_cure_setting("debug_after_init", debug_after_init);
}

export function init_cure_setting(settings: CureSetting) {
  if (!settings.enable_hook) {
    change_cure_setting("enable_hook", false);
    // cure_console.logger.slight_warn("No Hook", "Hook disabled");
    return;
  }

  for (const [key, value] of Object.entries(settings)) {
    // 1. 默认情况下，cure_settings 都有自己的默认值，可以很好的工作
    // 2. 从插件 storage 中读取配置项值时，如果 value 为 undefined，
    // 说明没有修改过配置项，那就不需要发送事件哟
    value !== undefined && change_cure_setting(key as keyof CureSetting, value);
  }
}

export function init_hooker_setting(settings: HookerSetting) {
  cure_console.logger.log_with_logo({
    logo: "TODO",
    data: ["init with hooker setting:", settings],
  });
}

/** 修改 cure_cure_settings */
export function change_cure_setting<T extends keyof CureSetting>(
  key: T,
  value: CureSetting[T],
) {
  if (key in cure_setting) {
    cure_setting[key] = value;

    // 当注入设置项完毕时，该消息表示暂停 —— 等待后续控制
    if (!is_initialized && key === "debug_after_init") {
      if (value) {
        curedebug();
        debugger;
      }
      is_initialized = true;
      cure_console.logger.log_with_logo({ logo: "Initialized" });
      if (cure_setting.no_log) {
        cure_console.logger.slight_warn(
          "No log",
          "Hook enabled, but no log output",
        );
      }
      return;
    }
    if (is_initialized && cure_setting.enable_hook) {
      cure_console.logger.log_with_logo({
        logo: "change setting",
        style: "cure_idol",
        data: [key, "=>", value],
      });
    }
  } else {
    cure_console.logger.warn(
      `Change cure settings`,
      `The key ${key} is invalid`,
    );
  }
}
