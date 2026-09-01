import cure_share from "../cure-share";

/** 用于控制是否启用某个 hooker，即是否 hook 某个东西。
 *
 * 而 `cure_setting` 控制启用某个功能，这些功能通常需要启用、配置一个或多个 hooker。
 *
 * 命名规范的生成需要调用 `cure_tool 中的 format_hooker_toggler_name` API
 */
export const hooker_toggler: Record<string, boolean> =
  cure_share.ElseFunc.create_clean_object(
    {
      // 这几个动态生成代码时容易出现作用域错误，默认不开启
      eval: false,
      setTimeout: false,
      setInterval: false,
    },
    false,
    "CureHookerToggler",
  );

/** 真正的 hooker setting，用于配置 hooker 的
 *
 * 命名规范的生成需要调用 `cure_tool 中的 format_hooker_toggler_name` API
 */
export const hooker_setting: HookerSetting =
  cure_share.ElseFunc.create_clean_object({}, false, "CureHookerSetting");
