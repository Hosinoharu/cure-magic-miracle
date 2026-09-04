/** 常用 hook 咯 */

import cure from "./cure";

/** 取消 hook 的逻辑 */
function disable_hook() {
  function disable() {
    // 取消所有的 hooker！真正的取消哟
    for (const v of cure.share.ObjectFunc.getOwnPropertyNames(cure.hooked)) {
      cure.hooked[v]?.release();
    }

    cure.console.logger.slight_warn(
      "Hook disabled",
      "When enable Hook, please reload page",
    );
  }

  // #cure-tip bind-setting.no_hook
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "enable_hook",
    enable_func: () => {},
    cancel_func: disable,
  });
}

/** 输出 hooker 的详细日志！*/
function open_hooker_log() {
  /** 开启所有 hooker 的日志，用于分析 */
  function switch_all_hooker_log(open: boolean) {
    for (const key of cure.share.ObjectFunc.keys(cure.hooked)) {
      const h = cure.hooked[key];
      if (h?.is_hooked && h.is_hooked()) {
        open ? h.open_hooker_log() : h.restore_hooker_log();
      }
    }
  }

  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "hooker_log",
    enable_func: () => switch_all_hooker_log(true),
    cancel_func: () => switch_all_hooker_log(false),
    default_value: false,
  });
}

/** hook-window 下面的函数 */
function hook_window_func() {
  // #region 去除参数中的debuggerbind-setting

  /** 一个辅助函数，去除 s 中的字符串 debugger 哟。
   * 如果没有开启 cure_settings.remote_debugger，则不会进行任何操作
   */
  function replace_debugger_statement(s: string) {
    // 将 debugger 替换成的注释哟
    const debugger_flag = "/*curemiracle_found_debugger*/;";
    let is_found = false;
    if (cure.cure_setting.remove_debugger) {
      is_found = cure.share.StringFunc.includes(s, "debugger");
      s = cure.share.StringFunc.replace(s, /\bdebugger\b/g, debugger_flag);
    }
    return { is_found, s };
  }

  /** 给 eval、Function 创建 remove_debugger 函数，需要传入它们在 cure.hooked 中的名称。
   *
   * **警告！对于 eval 可能出现闭包作用域问题**
   */
  function create_remove_debugger_end(name_in_curehooked: string) {
    /** 去除参数中的 debugger 语句，用于 eval 和 Function
         * 其中 Function 有多种版本，函数体在最后面哟
         * ```js
            new Function(functionBody)
            new Function(arg0, functionBody)
            new Function(arg0, arg1, functionBody)
            new Function(arg0, arg1,  argN, functionBody)
    
            Function(functionBody)
            Function(arg0, functionBody)
            Function(arg0, arg1, functionBody)
            Function(arg0, arg1, argN, functionBody)
         * ```
         */
    function remove_debugger(...args: string[]) {
      if (!cure.cure_setting.remove_debugger || args.length === 0) {
        return args;
      }

      const func_body = args[args.length - 1]!;
      const { is_found, s } = replace_debugger_statement(func_body);
      // 取消本次 hook 的输出
      const h = cure.hooked[name_in_curehooked] as ICureMethodHooker;
      if (is_found) {
        h.blink();
      }
      args[args.length - 1] = s;
      return args;
    }
    return remove_debugger;
  }

  /** 给 setTimeout、setInterval 创建 remove_debugger 函数，需要传入它们在 cure.hooked 中的名称。
   *
   * **警告！可能出现闭包作用域问题**
   */
  function create_remove_debugger_first(name_in_curehooked: string) {
    /** 去除参数中的 debugger 语句，用于 setTimeout、setInterval。
             * 因为 setTimeout 和 setInterval 的 func_body 在开头
             ```js
                setTimeout(code)
                setTimeout(code, delay)
    
                setTimeout(functionRef)
                setTimeout(functionRef, delay)
                setTimeout(functionRef, delay, param1)
                setTimeout(functionRef, delay, param1, param2)
                setTimeout(functionRef, delay, param1, param2, paramN)
            ```
            */
    function remote_debugger_first(...args: string[]) {
      if (!cure.cure_setting.remove_debugger) {
        return args;
      }

      let func_body = args[0] as string | NormalFunction;
      // func_body 既可以是字符串，也可以是函数哟
      const is_func = typeof func_body === "function";
      if (is_func) {
        func_body = cure.share.ElseFunc.get_func_string(func_body);
      }
      const { is_found, s } = replace_debugger_statement(func_body as string);
      // 取消本次的输出
      const h = cure.hooked[name_in_curehooked] as ICureMethodHooker;
      if (is_found) {
        h.blink();
      }
      // 如果参数是一个函数，将它转为字符串后无法执行的，需要包裹一下
      if (is_func) {
        args[0] = `(${s})()`;
      } else {
        args[0] = s;
      }

      return args;
    }
    return remote_debugger_first;
  }

  // #endregion

  // 重构后的代码，配置好初始化项之后，直接循环初始化
  const func_hook_info: { [k: string]: MethodHookerInitObj } = {
    eval: { debugger_statement_handler: create_remove_debugger_end("eval") },
    Function: {
      debugger_statement_handler: create_remove_debugger_end("Function"),
      call_new_param_return_log: false, // 不输出参数啦
    },
    setInterval: {
      debugger_statement_handler: create_remove_debugger_first("setInterval"),
    },
    setTimeout: {
      debugger_statement_handler: create_remove_debugger_first("setTimeout"),
    },
    // #cure-todo 默认不启用？后续通过 Hooker 配置项决定
    atob: {},
    btoa: {},
    encodeURI: {},
    encodeURIComponent: {},
    decodeURI: {},
    decodeURIComponent: {},
    postMessage: { call_new_param_return_log: true },
  };

  // #cure-tip bind-globalThis.xxxbind-setting
  for (const item of cure.share.ObjectFunc.getOwnPropertyNames(
    func_hook_info,
  )) {
    let _global = globalThis;
    let _des = "globalThis";
    // 本来应该具备该属性，结果现在没有具备，说明当前位于 worker 中
    if (
      !cure.share.ObjectFunc.hasOwn(globalThis, item) &&
      cure.share.current_cure_scope !== "Window"
    ) {
      // @ts-ignore
      _global = WorkerGlobalScope.prototype;
      _des = "WorkerGlobalScope.prototype";
    }
    cure.tool.setting_binder.create_hooker_switcher({
      setting: item,
      obj: _global,
      property: item,
      des: `${_des}.${item}`,
      init_obj: func_hook_info[item]!,
      default_value: true,
    });
  }

  // #cure-tip bind-setting.no_setInterval-bind-setting
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "no_interval",
    enable_func: () => {
      // 需要先启用功能嘛，涉及到作用域问题，默认没有启用
      cure.hooker_setting.setInterval = true;
      // 将 call 逻辑置空，但返回一个 id 0
      (cure.hooked.setInterval as ICureMethodHooker).set_call_handler(() => {
        return 0;
      });
    },
    cancel_func: () => {
      cure.hooker_setting.setInterval = false;
      (cure.hooked.setInterval as ICureMethodHooker).set_call_handler(
        undefined,
      );
    },
  });
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "no_timeout",
    enable_func: () => {
      // 需要先启用功能嘛，涉及到作用域问题，默认没有启用
      cure.hooker_setting.setTimeout = true;
      // 将 call 逻辑置空，但返回一个 id 0
      (cure.hooked.setTimeout as ICureMethodHooker).set_call_handler(() => {
        return 0;
      });
    },
    cancel_func: () => {
      cure.hooker_setting.setTimeout = false;
      (cure.hooked.setTimeout as ICureMethodHooker).set_call_handler(undefined);
    },
  });
  // #cure-tip bind-setting.hook_eval
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "hook_eval",
    enable_func: () => {
      cure.hooker_setting.eval = true;
    },
    // 此处应该释放 hook
    cancel_func: () => {
      cure.hooker_setting.eval = false;
      cure.hooked.eval?.release();
    },
  });
}

function hook_JSON() {
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "JSON.stringify",
    obj: JSON,
    property: "stringify",
    des: `JSON.stringify`,
    init_obj: { call_new_param_return_log: true },
    default_value: true,
  });
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "JSON.parse",
    obj: JSON,
    property: "parse",
    des: `JSON.parse`,
    init_obj: { call_new_param_return_log: false },
    default_value: true,
  });
}

function hook_cookie() {
  if (cure.share.current_cure_scope !== "Window") return;

  /** 以键值对的形式输出 cookie  */
  function cookie_displayer(cookie: string) {
    if (typeof cookie !== "string") {
      return cookie;
    }
    // 现在分成了 ["x=1", "y=2"] 等这样的形式
    const cookie_pairs = cure.share.StringFunc.split(cookie, ";");
    // 开始逐一处理
    const result: string[] = [];
    for (let i = 0; i < cookie_pairs.length; i++) {
      const res = cure.share.StringFunc.trim(cookie_pairs[i]);
      // 现在将 x=y 的形式拆分成更容易查看的 x  =>  y
      if (res) {
        // 注意键值可能为 `key=value==:5q` 这样经过 base64 编码的
        // 所以应该找左侧第一个 = 号才对
        const index = cure.share.StringFunc.indexOf(res, "=");
        const key = cure.share.StringFunc.substring(res, 0, index);
        const value = cure.share.StringFunc.substring(res, index + 1);
        const pad = cure.share.StringFunc.padEnd(key, 50, " ");
        cure.share.ArrayFunc.push(result, `\t${pad}  =>  ${value}`);
      }
    }
    return cure.share.ArrayFunc.join(result, "\n") as string;
  }

  // #cure-tip bind-hooker.document_cookie
  // 此处必须手动绑定，因为要指定调用 PropertyValueHooker
  const cookie_hooker = (cure.hooked["cookie"] = cure
    .create_propertyvalue_hooker(
      Document.prototype,
      "cookie",
      "document.cookie",
    )
    .set_getter_logger(true, cookie_displayer as DataDisplayer)
    .set_setter_logger(true, cookie_displayer as DataDisplayer));
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.hooker_setting,
    setting: "cookie",
    enable_func: () => {
      cookie_hooker.hook_it();
    },
    cancel_func: () => {
      cookie_hooker.unhook_it();
    },
    default_value: false,
  });

  // @ts-ignore
  const has_cookie_store = globalThis.CookieStore !== undefined;
  const can_hook_cookie_store =
    location.protocol === "https:" && has_cookie_store;
  // 还需要 hook CookieStore API 哟，不过它们都是异步方法
  // 该 API 只在 https 协议上可用

  if (can_hook_cookie_store) {
    // 记录要 hook 哪些方法，以及它们的 init_obj
    const hooker_info: { [k: string]: MethodHookerInitObj } = {
      get: { call_new_param_return_log: false },
      getAll: { call_new_param_return_log: false }, // 返回值才重要
      set: { call_new_param_return_log: true }, // 返回值不重要所以忽略
      delete: { call_new_param_return_log: true },
    };
    // 然后循环创建
    for (const item of cure.share.ObjectFunc.getOwnPropertyNames(hooker_info)) {
      cure.tool.setting_binder.create_hooker_switcher({
        setting: `CookieStore.prototype.${item}`,
        // @ts-ignore
        obj: CookieStore.prototype,
        property: item,
        des: `CookieStore.prototype.${item}`,
        init_obj: hooker_info[item]!,
        default_value: false,
      });
    }
  }

  // #cure-tip bind-setting.cookie
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "cookie",
    enable_func: () => {
      cure.hooker_setting.cookie = true;
      if (can_hook_cookie_store) {
        cure.hooker_setting.CookieStore_p_get = true;
        cure.hooker_setting.CookieStore_p_getAll = true;
        cure.hooker_setting.CookieStore_p_set = true;
        cure.hooker_setting.CookieStore_p_delete = true;
      }
    },
    cancel_func: () => {
      cure.hooker_setting.cookie = false;
      if (can_hook_cookie_store) {
        cure.hooker_setting.CookieStore_p_get = false;
        cure.hooker_setting.CookieStore_p_getAll = false;
        cure.hooker_setting.CookieStore_p_set = false;
        cure.hooker_setting.CookieStore_p_delete = false;
      }
    },
  });
}

function hook_TextEncodeTextDecode() {
  /** 在 hook TextDecoder、TextEncoder 的实例时，希望可以输出它们的 encoding。
   *
   * 所以本方法就是根据 this（encoder 或 decoder）获取它们的 encoding 咯
   */
  function get_encoding(obj: TextDecoder | TextEncoder, raw_des: string) {
    return `${raw_des}(${obj.encoding})`;
  }

  // #cure-tip bind-hooker.TextEncode-TextDecode
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "TextEncoder.prototype.encode",
    obj: TextEncoder.prototype,
    property: "encode",
    des: "TextEncoder.prototype.encode",
    init_obj: { call_new_param_return_log: true, description: get_encoding },
    default_value: true,
  });
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "TextDecoder.prototype.decode",
    obj: TextDecoder.prototype,
    property: "decode",
    des: "TextDecoder.prototype.decode",
    init_obj: { call_new_param_return_log: false, description: get_encoding },
    default_value: true,
  });
}

function hook_storage() {
  if (cure.share.current_cure_scope !== "Window") return;

  /** 在 setItem 时更好的输出键值对信息 */
  function set_item_displayer(key: string, value: string) {
    return `Key => ${key} \nValue => ${value} `;
  }

  /** 添加后缀，表明是哪个 storage 实例在操作 */
  function description(this_arg: Storage, raw_des: string) {
    if (this_arg === localStorage) {
      return `${raw_des}(localStorage)`;
    } else if (this_arg === sessionStorage) {
      return `${raw_des}(sessionStorage)`;
    }
    return `${raw_des}(unknown storage object)`;
  }

  // #cure-tip bind-hooker.Storage
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Storage.prototype.getItem",
    obj: Storage.prototype,
    property: "getItem",
    des: "Storage.prototype.getItem",
    init_obj: { description },
    default_value: true,
  });
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Storage.prototype.setItem",
    obj: Storage.prototype,
    property: "setItem",
    des: "Storage.prototype.setItem",
    init_obj: {
      call_new_param_return_log: true,
      call_param_logger: set_item_displayer as DataDisplayer,
      description,
    },
    default_value: true,
  });
}

function hook_crypto() {
  if (!globalThis.Crypto) return;

  // 不需要 hook 这两个函数，仅在需要的时候触发断点
  // #cure-tip bind-hooker.crypto.getRandomValues
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Crypto.prototype.getRandomValues",
    obj: Crypto.prototype,
    property: "getRandomValues",
    des: "Crypto.prototype.getRandomValues",
    init_obj: {
      call_new_no_log: true,
      call_param_debug: true,
    },
    default_value: false,
  });
  // #cure-tip bind-hooker.crypto.randomUUID()
  // 该方法可能不存在？！我也不清楚为什么
  Crypto.prototype.randomUUID !== undefined &&
    cure.tool.setting_binder.create_hooker_switcher({
      setting: "Crypto.prototype.randomUUID",
      obj: Crypto.prototype,
      property: "randomUUID",
      des: "Crypto.prototype.randomUUID",
      init_obj: {
        call_new_no_log: true,
        call_param_debug: true,
      },
      default_value: false,
    });
}

export function normal_01() {
  disable_hook();
  open_hooker_log();

  hook_window_func();
  hook_JSON();
  hook_cookie();
  hook_TextEncodeTextDecode();
  hook_storage();
  hook_crypto();
}
