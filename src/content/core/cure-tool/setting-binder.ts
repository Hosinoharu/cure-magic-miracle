/** 绑定设置项的 api */

import { hooker_toggler } from "../cure-settings";
import cure_console from "../cure-console";
import cure_share from "../cure-share";
import { create_object_hooker, cure_hooked } from "../cure-core";

/** 用于创建配置项 `hooker_toggler` 中的名称
 *
 * 使用方式 `format_hooker_toggler_name("Date.now")`
 * 直接传入要 hook 对象的访问名称即可。
 *
 * 生成的命名规范如下
 *
 * 1. 如果位于 `globalThis` 下，则直接使用对象的名称，
 * 比如 `hook eval` 时使用配置项名称 `eval`
 *
 * 2. 如果位于特定的对象下，则使用下划线分割，
 * 比如 `hook Date.now()` 时使用配置项名称 `Date_now`
 *
 * 3. 如果它在原型上，则使用 `_p_` 标识，
 * 比如 `hook Function.prototype.toString()` 时使用配置项名称 `Function_p_toString`
 */
function format_hooker_toggler_name(name: string) {
  const a = cure_share.StringFunc.replaceAll(name, ".prototype.", "_p_");
  const b = cure_share.StringFunc.replaceAll(a, ".", "_");
  return b;
}

/** 这是一个辅助函数，用于在修改设置项时可以实时做出改变。
 * 比如在设置 `cure_setting.x = true` 时可以快速开启一些功能。
 *
 * 可以理解 “开关” 的意思：开启时执行 A 功能，关闭时执行 B 功能等等。
 * 本质上是给它添加 `getter/setter` 啦。
 */
export function create_setting_switcher({
  target,
  setting,
  enable_func,
  cancel_func,
  setter,
  default_value,
}: CreateSettingSwitcherParam) {
  let raw = target[setting];
  if (raw === undefined) {
    if (default_value === undefined)
      throw new cure_share.CureError(
        `[${target}.${setting}] default value is undefined`,
      );
    raw = default_value;
  }

  // 避免重复调用 “功能开启时的函数”。
  // 比如 `A.x = 1` 开启了功能，那么 `A.x = 2` 就不需要再开启一次功能了。
  let enabled = false;

  cure_share.ObjectFunc.defineProperty(target, setting, {
    get() {
      return raw;
    },
    set(v: boolean | string | number) {
      // 预先处理啦
      if (setter) {
        v = setter(v);
      }
      raw = v;

      if (v) {
        // 避免重复调用启动函数
        if (!enabled) {
          enable_func();
          enabled = true;
        }
      } else if (enabled) {
        if (cancel_func) {
          cancel_func();
          enabled = false;
        } else {
          cure_console.logger.log_with_logo({
            data: [`${setting} can't be cancelled`],
          });
        }
      }

      return raw;
    },
  });

  // 最后根据设置的初始值，进行一次 set 操作，完成初始化
  if (raw) {
    enable_func();
    enabled = true;
  } else {
    if (cancel_func) {
      cancel_func();
      enabled = false;
    }
  }
}

/** 本方法就是迅速创建方法或者对象的 hooker，然后与 `hooker_setting` 配置项关联起来。
 * 用于来快速开启或关闭 hook 功能。同时创建的 `hooker` 需要添加到 `cure_hooked` 中。
 *
 * 比如 `hooker_setting.x = true` 开启 x 的 hook 功能，`hooker_setting.x = false` 关闭 x 的 hook 功能。
 */
export function create_hooker_switcher({
  setting,
  obj,
  property,
  des,
  init_obj,
  setter,
  default_value,
  keep_on = false,
}: CombineHookerSettingParam) {
  setting = format_hooker_toggler_name(setting);

  // 如果原本存在默认值，此处将直接忽略。这是一个优先级的问题啦
  if (hooker_toggler[setting] === undefined) {
    hooker_toggler[setting] = default_value;
  }

  const hooker = create_object_hooker(obj, property, des);
  if (!hooker) {
    throw new cure_share.CureError("Call create_object_hooker error");
  }

  // 不需要 hook eval 和 setTimeout 等，涉及到闭包作用域问题，等将来需要的时候手动启动
  if (
    obj === globalThis &&
    (property === "eval" ||
      property === "setTimeout" ||
      property === "setInterval")
  ) {
    hooker.release();
  }

  // @ts-ignore
  cure_hooked[setting] = hooker.init(init_obj);
  const cancel_func = keep_on
    ? () => {
        cure_console.logger.log_with_logo({
          data: [`${setting} can't be cancelled`],
        });
      }
    : () => hooker.unhook_it();
  // 关联到设置项 hooker_setting[setting] 中
  create_setting_switcher({
    target: hooker_toggler,
    setting,
    enable_func: () => hooker.hook_it(),
    cancel_func,
    setter,
    default_value,
  });
  return hooker;
}
