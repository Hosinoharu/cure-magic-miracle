/** 解决反调试 */

import cure from "./cure";

/** 解决 F12 检测 */
function skip_f12_check() {
  if (cure.share.current_cure_scope !== "Window") return;

  function skip_f12(e: KeyboardEvent) {
    /*
        stopImmediatePropagation() 不仅阻止了事件的传播，
        还阻止了当前元素上其他事件处理函数的执行。
        而 stopPropagation() 只阻止了事件的冒泡传播。

        如果配合“捕获阶段”进行阻止，就可以过掉 F12 检测了。
      */
    if (e.key === "F12") {
      e.stopImmediatePropagation();
    }
  }

  // document.addEventListener("keydown", skip_f12, true);
  cure.share.EventFunc.add_event(document, "keydown", skip_f12, true);
  // document.addEventListener("keypress", skip_f12, true);
  cure.share.EventFunc.add_event(document, "keypress", skip_f12, true);
  // document.addEventListener("keyup", skip_f12, true);
  cure.share.EventFunc.add_event(document, "keyup", skip_f12, true);
  // globalThis.addEventListener("keydown", skip_f12, true);
  cure.share.EventFunc.add_event(globalThis, "keydown", skip_f12, true);
  // globalThis.addEventListener("keypress", skip_f12, true);
  cure.share.EventFunc.add_event(globalThis, "keypress", skip_f12, true);
  // globalThis.addEventListener("keyup", skip_f12, true);
  cure.share.EventFunc.add_event(globalThis, "keyup", skip_f12, true);
}

/** 解决控制台的检测
 *
 * 其原理大都会用到 console.log 等方法，并且网站可能重写某个对象的 toString 方法，
 *
 * 这样当输出该对象到控制台时就会触发重写的 toString 方法咯。
 */
function skip_devtools_check() {
  /** 过滤掉 console API 要输出的内容。返回 true 将禁止本次的输出。
   *
   * **本方案仅有限的情况有效，如果无法解决，应该直接禁用所有的输出哟**。
   */
  function filter_log_args(args: unknown[]) {
    for (const arg of args) {
      if (typeof arg !== "object" || !arg) {
        continue;
      }
      // 平时输出的时候判断输出的对象有没有 .toString()，如果有，则禁止输出！
      // 额，经过实践，似乎没必要呀，容易忽略网站输出的信息
      // if (cure.share.ObjectFunc.hasOwnProperty(arg, 'toString')) {
      // cure.console.lite_warn(`[Console API] stop log once, because output object has one toString function`);
      // return true; // 相当于置空函数
      // }

      // 特殊情况，如果输出一个 Error 对象，但它的 message、stack 属性带有 getter
      // ……嗯？？为什么 `Object.defineProperty` 没有拦截它们呢？？？
      // 而且，使用 `arg instanceof Error` 还匹配不到，真奇怪
      if (
        is_error_obj(arg) ||
        cure.tool.normal.get_type(arg) === "Error" ||
        curemiracle_is_target_error(arg as Error, "Console API")
      ) {
        return true;
      }
    }
    return false;
  }

  /** 创建 call_handler。传入参数 `filter` 决定是否“过滤参数”。
   *
   * “过滤” 参数主要用于 `log、info` 等 API，其它的就不需要过滤了。
   */
  function create_call_handler(filter: boolean) {
    return function curemiracle_call_handler(
      this: object,
      hooked_target: NormalFunction,
      ...args: unknown[]
    ) {
      if (cure.cure_setting.no_console || (filter && filter_log_args(args))) {
        return;
      }

      const res = cure.share.ReflectFunc.apply(hooked_target, this, args);
      // 输出哪里调用了该 console API，仅输出顶部堆栈
      const stack = cure.tool.stack_handler.curemiracle_get_entrypoint();
      if (stack) {
        cure.console.logger.log_with_logo({
          logo: "CureMiracle call location",
          data: [`console.${hooked_target.name}:`, stack],
        });
      }
      return res;
    };
  }

  const handler_on = create_call_handler(true);
  const handler_off = create_call_handler(false);

  // #cure-tip hook-consoleApibind-setting
  /** hook console api，并返回 hooker */
  function hook_console_api() {
    const hooker: ICureHooker[] = [];
    const items = cure.share.ObjectFunc.getOwnPropertyNames(console) as Array<
      keyof Console
    >;
    // 忽略 clear，因为它默认开启
    // 忽略 createTask，因为它不影响输出
    const ignores = ["clear", "createTask"];
    for (const item of items) {
      if (
        typeof console[item] !== "function" ||
        cure.share.ArrayFunc.includes(ignores, item)
      ) {
        continue;
      }

      const is_target = item === "log" || item === "info" || item === "debug";
      const call_handler = is_target ? handler_on : handler_off;

      const visit_path = `console.${item}`;
      const h = cure.tool.setting_binder.create_hooker_switcher({
        setting: visit_path,
        obj: console,
        property: item,
        des: visit_path,
        init_obj: {
          call_handler,
          call_new_no_log: true,
        },
        default_value: true,
      });
      cure.share.ArrayFunc.push(hooker, h);
    }
    return hooker;
  }

  // #cure-tip 禁止网站清空控制台
  // #cure-tip hook-console_clear-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "console.clear",
    obj: console,
    property: "clear",
    des: "console.clear",
    init_obj: {
      call_handler: () => {},
      call_new_no_log: true,
    },
    default_value: true,
    keep_on: true,
  });
  hook_console_api();
}

/** hook 属性描述符，解决报错式检测，
 * 同时还要阻止网站通过属性描述符修改已经被 Hook 的属性哟
 */
function hook_defineProperty() {
  /** 合并两个属性描述符，并返回新的。
   *
   * 现阶段，插件将所有 hook 的属性都变为 getter/setter 了，
   * 如果网站使用 {writable: xx} 来修改属性，那么将直接删除掉 getter/setter，
   * 我觉得不阻止它，而是让它这样做！
   */
  function merge_attribute(
    raw_value: object,
    from: PropertyDescriptor,
    to?: PropertyDescriptor,
  ) {
    if (!to) return from;
    if (from.configurable !== undefined) {
      to.configurable = from.configurable;
    }
    if (from.writable !== undefined) {
      to.writable = from.writable;
    }
    // 如果 from 具备 value 属性，则需要删除 to 中的 getter/setter 并更新 value
    if (cure.share.ObjectFunc.hasOwn(from, "value")) {
      to.value = from.value;
      delete to.get;
      delete to.set;
    }
    // 如果 from 具备 getter/setter 属性，则需要删除 to 中的 value 并更新 getter/setter
    else if (
      cure.share.ObjectFunc.hasOwn(from, "get") ||
      cure.share.ObjectFunc.hasOwn(from, "set")
    ) {
      from.get = to.get = from.get;
      from.set = to.set = from.set;
      delete from.configurable;
      delete to.value;
      delete to.writable;
    }
    // 否则，就需要给 from 添加完成的 value 属性了
    else {
      from.value = raw_value;
    }
    return from;
  }

  /** 处理属性描述符，**并返回新的描述符哟**。其功能报错
   * - 当网站想改变 hooker 的属性描述符时，让它做！仅输出一下
   * - 去除报错式检测的逻辑
   */
  function curemiracle_process_attributes(
    o: object,
    p: PropertyKey,
    attributes: PropertyDescriptor,
  ) {
    // 网站实践，attributes 可能是被 freeze 了，就需要创建副本
    attributes = cure.tool.normal.copy_frozen_obj(attributes);
    // 使用 cure_settings.find_property 功能时，如果监听的属性名是一个特殊的情况！
    // 也就是刚好为属性描述符的那 4 个家伙，那么就会出错，这涉及到原型链的问题，所以这里处理
    cure.share.ObjectFunc.setPrototypeOf(attributes, null);
    if (p === undefined) {
      return attributes;
    }
    // o 可能是一个已经被 Hook 的对象，所以必须先拿到底层的对象
    o = cure.tool.proxy_handler.get_raw_obj_from_proxy(o);

    let proxy = undefined;
    // 对象 o 的属性已经被 hook 过了，那么输出警告信息！
    // 以前是禁止这种操作的，但可能造成网页功能异常啦
    if (cure.tool.property_handler.is_hooked_property(o, p)) {
      // 服了！部分网站会使用 `delete o.p` 来删除属性，从而丢失 hooker 啦！
      // 因为没有 hook 对象 o，只 hook 了它的属性 p，所以无从得知具体发生了什么！
      // 此外，比如获取 `Document.prototype.cookie` 时也会报错哟！
      try {
        proxy = cure.share.ReflectFunc.get(o, p);
      } catch {}
      // 获取该 proxy 的描述信息
      const des = proxy
        ? (proxy[cure.tool.constant.proxy_description_symbol] as string)
        : cure.share.ElseFunc.to_normal_string(p);
      cure.console.logger.slight_warn(
        "Change Hooker",
        // 下面输出对象信息时用的是 .name 属性，可能结果不符合预期
        `Web use [Object.defineProperty()] to change hooked property [${des ?? p}]` +
          `\nSet descriptor:`,
        attributes,
      );
      // 这是对象 o[p] 原始的属性描述符，需要进行合并嘛！
      if (proxy) {
        const raw_attribute =
          proxy[cure.tool.constant.proxy_raw_descriptor_symbol];
        attributes = merge_attribute(proxy, attributes, raw_attribute);
      }
    }

    // 去除报错式检测的逻辑
    // 后面通过注册时间拦截了所有未被处理的、抛出的错误，为了保险起见，这里也处理一下
    // 经过实践，额，在部分网站上会影响其功能，所以取消该部分吧
    // if (is_error_obj(o)) {
    //     const getter = attributes.get;
    //     const a = curemiracle_check_err_getter(`Object.defineProperty()`, getter);
    //     if (a) { attributes.get = function curemiracle_empty() { }; }
    // }

    return attributes;
  }

  // #cure-tip hook-defineProperty-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Object.defineProperty",
    obj: Object,
    property: "defineProperty",
    des: "Object.defineProperty",
    init_obj: {
      call_handler: function curemiracle_defineProperty(
        this: object,
        _hooked_target: NormalFunction,
        ...args: [object, PropertyKey, PropertyDescriptor]
      ) {
        const [o, p, attributes] = args;
        return cure.share.ObjectFunc.defineProperty(
          o,
          p,
          curemiracle_process_attributes(o, p, attributes),
        );
      },
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
    keep_on: true,
  });

  // #cure-tip hook-Reflect.defineProperty-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Reflect.defineProperty",
    obj: Reflect,
    property: "defineProperty",
    des: "Reflect.defineProperty",
    init_obj: {
      call_handler: function curemiracle_defineProperty(
        this: object,
        _hooked_target: NormalFunction,
        ...args: [object, PropertyKey, PropertyDescriptor]
      ) {
        const [o, p, attributes] = args;
        return cure.share.ReflectFunc.defineProperty(
          o,
          p,
          curemiracle_process_attributes(o, p, attributes),
        );
      },
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
    keep_on: true,
  });

  // #cure-tip hook-defineProperties-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Object.defineProperties",
    obj: Object,
    property: "defineProperties",
    des: "Object.defineProperties",
    init_obj: {
      call_handler: function curemiracle_defineProperties(
        this: object,
        _hooked_target: NormalFunction,
        ...args: [object, PropertyDescriptorMap]
      ) {
        const [o, properties] = args;
        // 网站中 properties 的属性可能会无法修改，导致后面的赋值出错，所以创建副本好了
        const new_properties = cure.share.ObjectFunc.create(null);
        // Object.keys 方法来获取对象自身的属性数组，然后可以进行遍历了
        // p 是属性名，propertyies[p] 是它的属性描述符
        for (const p of cure.share.ObjectFunc.keys(properties)) {
          new_properties[p] = curemiracle_process_attributes(
            o,
            p,
            properties[p]!,
          );
        }
        return cure.share.ObjectFunc.defineProperties(o, new_properties);
      },
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
    keep_on: true,
  });

  // #cure-tip hook-__defineGetter__-keepOn
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (Object.prototype.__defineGetter__) {
    cure.tool.setting_binder.create_hooker_switcher({
      setting: "Object.prototype.__defineGetter__",
      obj: Object.prototype,
      property: "__defineGetter__",
      des: "Object.prototype.__defineGetter__",
      init_obj: {
        call_handler: function curemiracle__defineGetter__(
          this: object,
          hooked_target: NormalFunction,
          ...args: [PropertyKey, NormalFunction]
        ) {
          // eslint-disable-next-line prefer-const
          let [p, getter] = args;
          if (
            is_error_obj(args) &&
            curemiracle_check_err_getter(
              `Object.prototype.__defineGetter__()`,
              getter,
            )
          ) {
            getter = function curemiracle_empty() {};
          }
          return cure.share.ReflectFunc.apply(hooked_target, this, [p, getter]);
        },
        call_new_no_log: true,
        getter_setter_no_log: true,
      },
      default_value: true,
      keep_on: true,
    });
  }
}

/** 捕获所有抛出的 Error，解决报错式检测
 *
 * 仅 hook 属性描述符可能存在漏网之鱼，所以需要拦截所有抛出的错误，
 * 检查 Error 对象的 message、stack 属性是否具有 getter 哟
 */
function hook_throw_error() {
  // 拦截页面抛出的错误，第三个参数为 true 则是在传播阶段捕获，能捕获 <img> 等标签的加载错误
  function curemiracle_error_event(e: ErrorEvent) {
    const error = e.error;
    // 阻止错误继续抛出
    if (error && curemiracle_is_target_error(error, "Error Event")) {
      e.preventDefault();
    }
  }

  //  globalThis.addEventListener("error", curemiracle_error_event);
  cure.share.EventFunc.add_event(globalThis, "error", curemiracle_error_event);

  function curemiracle_error_event_2(e: PromiseRejectionEvent) {
    const target = e.reason;
    // 是字符串直接忽略
    if (!target || typeof target === "string") return;
    // 阻止错误继续抛出
    if (curemiracle_is_target_error(target, "Promise Rejection Event")) {
      e.preventDefault();
    }
  }

  // 拦截 Promise rejection 抛出的错误
  // globalThis.addEventListener("unhandledrejection", curemiracle_error_event_2);
  cure.share.EventFunc.add_event(
    globalThis,
    "unhandledrejection",
    curemiracle_error_event_2,
  );
}

/** 解决属性描述符检测
 *
 * 因为 hook 过程中需要监控读写，所以会修改默认的属性描述符，
 *
 * 比如 `globalThis.atob` 默认的属性描述符为：`{writable: true, enumerable: true, configurable: true, value: ƒ}`
 *
 * 被 hook 后，属性描述符变为：`{enumerable: true, configurable: true, get: ƒ, set: ƒ}`
 *
 * 这是容易被检测的哟
 */
function hook_getOwnPropertyDescriptor() {
  /** 处理属性 o[[p] 的属性描述符，传入的 des 是实际上获得的属性描述符哟] */
  function handle_property_descriptor(
    o: object,
    p: string,
    des: PropertyDescriptor,
  ) {
    // 1. 具备 value 属性，则不是被 hook 过的，因为现在强制添加 getter/setter
    if (cure.share.ObjectFunc.hasOwn(des, "value")) return des;
    // 2. 因为采取了强制添加 getter/setter，它们是普通函数，可以通过函数名来判断是否为 hook 的
    const getter = des.get ? cure.share.ElseFunc.get_func_string(des.get) : "";
    const setter = des.set ? cure.share.ElseFunc.get_func_string(des.set) : "";
    if (
      !cure.share.StringFunc.startsWith(
        getter,
        "function curemiracle_initial_get",
      ) &&
      !cure.share.StringFunc.startsWith(
        setter,
        "function curemiracle_initial_set",
      )
    ) {
      return des;
    }

    // 至此，可以肯定该属性被 hook 过了，需要获取属性值，获取原来的属性描述符啦

    const property_value = cure.share.ReflectFunc.get(o, p);
    // 3. 如果它不是一个 proxy，说明已经被网站重写了呀！
    // 放心，如果是通过  Object.defineProperty 重写的，则不会运行到此处哟！
    if (!cure.tool.proxy_handler.is_cure_proxy(property_value)) {
      return {
        value: property_value,
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    // 5. 然后就是获取原来的属性描述符咯
    const raw_des: PropertyDescriptor =
      property_value[cure.tool.constant.proxy_raw_descriptor_symbol];
    raw_des.value = property_value;
    return { ...raw_des };
  }

  /** 返回对象 o 的、属性 p 的属性描述符（伪造过的）。其中 `o[p]` 就是被 hook 过的哟 */
  function get_descriptor(
    _hooked_target: NormalFunction,
    o: object,
    p: string,
  ): PropertyDescriptor | undefined {
    o = cure.tool.proxy_handler.get_raw_obj_from_proxy(o);
    /** 获取当前的属性描述符 */
    const des: PropertyDescriptor | undefined =
      cure.share.ObjectFunc.getOwnPropertyDescriptor(o, p);
    return des ? handle_property_descriptor(o, p, des) : des;
  }

  /** 获取对象 o 的所有属性描述符 */
  function get_descriptors(
    _hooked_target: NormalFunction,
    o: object,
  ): { [x: string]: PropertyDescriptor } {
    o = cure.tool.proxy_handler.get_raw_obj_from_proxy(o);
    const all_des: { [x: string]: PropertyDescriptor } =
      cure.share.ObjectFunc.getOwnPropertyDescriptors(o);
    const names = cure.share.ObjectFunc.getOwnPropertyNames(all_des);
    for (const p of names) {
      const des = all_des[p]!;
      const new_des = handle_property_descriptor(o, p, des);
      all_des[p] = new_des;
    }
    return all_des;
  }

  // #cure-tip hook-getOwnPropertyDescriptor-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Object.getOwnPropertyDescriptor",
    obj: Object,
    property: "getOwnPropertyDescriptor",
    des: "Object.getOwnPropertyDescriptor",
    init_obj: {
      call_handler: get_descriptor,
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
  });
  // #cure-tip hook-getOwnPropertyDescriptors-keepOn
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Object.getOwnPropertyDescriptors",
    obj: Object,
    property: "getOwnPropertyDescriptors",
    des: "Object.getOwnPropertyDescriptors",
    init_obj: {
      call_handler: get_descriptors,
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
  });
  // 顺便把 Reflect.getOwnPropertyDescriptor 也 hook 一下
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Reflect.getOwnPropertyDescriptor",
    obj: Reflect,
    property: "getOwnPropertyDescriptor",
    des: "Reflect.getOwnPropertyDescriptor",
    init_obj: {
      call_handler: get_descriptor,
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
  });
}

function hook_SetPrototypeOf() {
  function check_cycle_proto(
    this: object,
    hooked_target: NormalFunction,
    o: object,
    proto: object,
  ) {
    // 仅在添加 hooker 时检查
    if (!proto || !cure.tool.proxy_handler.is_cure_proxy(proto)) {
      return hooked_target(o, proto);
    }
    // 循环检查原型链
    let current = proto;
    while (current) {
      if (current === o) {
        const error = new TypeError("Cyclic __proto__ value");
        // 需要重构堆栈！此处只需要替换顶部堆栈即可
        const stack = cure.share.StringFunc.split(error.stack, "\n");
        stack[1] = "    at Object.setPrototypeOf (<anonymous>)";
        error.stack = cure.share.ArrayFunc.join(stack, "\n") as string;
        throw error;
      }
      current = cure.share.ObjectFunc.getPrototypeOf(current);
    }
    return hooked_target(o, proto);
  }
  // 给 Reflect_SetPrototypeOf 用的，因为它不跑出错误
  function check_cycle_proto2(
    this: object,
    hooked_target: NormalFunction,
    o: object,
    proto: object,
  ) {
    if (!proto || !cure.tool.proxy_handler.is_cure_proxy(proto)) {
      return hooked_target(o, proto);
    }
    let current = proto;
    while (current) {
      if (current === o) {
        return false;
      }
      current = cure.share.ObjectFunc.getPrototypeOf(current);
    }
    return hooked_target(o, proto);
  }

  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Object_setPrototypeOf",
    obj: Object,
    property: "setPrototypeOf",
    des: "Object.setPrototypeOf",
    init_obj: {
      call_handler: check_cycle_proto,
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
  });
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Reflect_setPrototypeOf",
    obj: Reflect,
    property: "setPrototypeOf",
    des: "Reflect.setPrototypeOf",
    init_obj: {
      call_handler: check_cycle_proto2,
      call_new_no_log: true,
      getter_setter_no_log: true,
    },
    default_value: true,
  });
}

/** 禁止页面跳转、刷新 */
function stop_redirect() {
  if (cure.share.current_cure_scope !== "Window") return;
  // 仅作用于顶层 iframe
  if (!cure.tool.normal.is_top_frame()) return;

  /** 有 `beforeunload、navigate` 两个事件可以拦截网站跳转。
   *
   * 触发顺序：`navigate` --> `beforeunload`
   *
   * **该 Navigation API 目前还是实验性功能，但它可以拦截所有跳转**
   *
   * https://developer.mozilla.org/zh-CN/docs/Web/API/Navigation/navigate_event
   *
   * `beforeunload` 的特点：
   * - 需要和网站进行交互
   * - 可以拦截快捷键、鼠标等网站刷新行为 —— 并非由 JS 触发的导航
   *
   * `navigate` 的特点：
   * - 拦截范围更广，且不需要和网站进行交互
   * - 无法拦截快捷键、鼠标等网站刷新行为，但可以拦截 JS 触发的导航
   * - 还能拦截更多行为，比如下载文件、表单提交等
   *
   * **最终：优先使用 `navigate` 事件进行拦截，如果没有该 API 就使用 `beforeunload`**
   *
   * 因为反调试的时候都是由 JS 触发的网页跳转，所以 `navigate` 更合适啦，至少按 F5 刷新网页
   * 的时候不会触发拦截。
   */
  const has_navigation = window.navigation !== undefined;

  /** beforeunload 事件触发之前，需要和网站进行交互，js 模拟的不行哟 */
  function beforeunload_event_func(this: Window, event: BeforeUnloadEvent) {
    if (!cure.cure_setting.stop_redirect) {
      return;
    }

    cure.tool.normal.curedebug();
    debugger;
    // Cancel the event as stated by the standard.
    event.preventDefault();
    // Chrome requires returnValue to be set.
    event.returnValue = "";
  }

  const confirm = globalThis.confirm;
  /** 用于 `navigate` 事件的处理函数
   * @param event 事件对象，具体见 [MDN NavigateEvent](https://developer.mozilla.org/zh-CN/docs/Web/API/NavigateEvent)
   */
  function navigate_event_func(this: Window, event: NavigateEvent) {
    if (!cure.cure_setting.stop_redirect) return;

    // 因为触发导航有很多情况，在调试过程中以下几种情况不处理
    // 下载文件的导航
    if (event.downloadRequest !== null) return;
    // 表单提交的导航
    if (event.formData !== null) return;
    // hash 变化的导航
    if (event.hashChange) return;
    // 用户引发的导航（前进后退）
    if (event.userInitiated) return;

    if (
      !confirm("[CureMiracle]   (＃°Д°)   网页即将进行跳转，确定要离开吗？")
    ) {
      event.preventDefault(); // 阻止网页跳转
      /** 记录输出的额外信息 */
      let msg = "";
      if (event.navigationType === "reload") {
        msg = "Stop reload page";
      } else {
        msg = "Stop redirecting to: " + (event?.destination?.url || "");
      }
      cure.console.logger.log_with_logo({ data: [msg] });
    }

    cure.tool.normal.curedebug();
    debugger;
  }

  const hookers: ICureHooker[] = [];

  // #cure-tip hook-globalThis.close
  const h1 = cure.tool.setting_binder.create_hooker_switcher({
    setting: "window.close",
    obj: globalThis,
    property: "close",
    des: "globalThis.close()",
    init_obj: {
      call_handler: function curemiracle_close(
        this: object,
        hooked_target: NormalFunction,
        ...args: unknown[]
      ) {
        if (cure.cure_setting.stop_redirect) {
          cure.console.logger.slight_warn(
            "Stop redirect",
            `calling globalThis.close()`,
          );
          return;
        }
        return cure.share.ReflectFunc.apply(hooked_target, this, args);
      },
      call_new_no_log: true,
    },
    default_value: false,
  });

  // #cure-tip hook-globalThis.open
  const h2 = cure.tool.setting_binder.create_hooker_switcher({
    setting: "window.open",
    obj: globalThis,
    property: "open",
    des: "globalThis.open()",
    init_obj: {
      call_handler: function curemiracle_open(
        this: object,
        hooked_target: NormalFunction,
        ...args: Parameters<Window["open"]>
      ) {
        const [url, target] = args;
        // 仅阻止覆盖当前页面的跳转
        if (cure.cure_setting.stop_redirect && target === "_self") {
          cure.console.logger.slight_warn(
            "Stop redirect",
            `Stop calling globalThis.open() on _self with url: ${url}.`,
          );
          return;
        }
        return cure.share.ReflectFunc.apply(hooked_target, this, args);
      },
      // 只输出参数
      call_new_param_return_log: true,
    },
    default_value: false,
  });

  // #cure-tip hook-document.open
  const h3 = cure.tool.setting_binder.create_hooker_switcher({
    setting: "Document.prototype.open",
    obj: Document.prototype,
    property: "open",
    des: "document.open()",
    init_obj: {
      call_handler: function curemiracle_open(
        this: Document,
        hooked_target: Document["open"],
        ...args: Parameters<Document["open"]>
      ) {
        // 仅阻止覆盖当前页面的跳转
        if (cure.cure_setting.stop_redirect) {
          cure.console.logger.slight_warn(
            "Stop redirect",
            `Stop calling document.open() with:`,
            args,
          );
          return;
        }
        return cure.share.ReflectFunc.apply(hooked_target, this, args);
      },
      // 只输出参数
      call_new_param_return_log: true,
    },
    default_value: false,
  });

  cure.share.ArrayFunc.push(hookers, h1);
  cure.share.ArrayFunc.push(hookers, h2);
  cure.share.ArrayFunc.push(hookers, h3);

  // #cure-tip bind-setting.stop_redirectbind-setting
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "stop_redirect",
    enable_func: () => {
      for (const h of hookers) {
        h.hook_it();
      }
      if (has_navigation) {
        // globalThis.navigation?.addEventListener("navigate", navigate_event_func);
        cure.share.EventFunc.add_event(
          globalThis.navigation,
          "navigate",
          navigate_event_func,
        );
      } else {
        // globalThis.addEventListener("beforeunload", beforeunload_event_func);
        cure.share.EventFunc.add_event(
          globalThis,
          "beforeunload",
          beforeunload_event_func,
        );
      }
    },
    cancel_func: () => {
      for (const h of hookers) {
        h.unhook_it();
      }
      if (has_navigation) {
        // globalThis.navigation?.removeEventListener("navigate", navigate_event_func);
        cure.share.EventFunc.remove_event(
          globalThis.navigation,
          "navigate",
          navigate_event_func as NormalFunction,
        );
      } else {
        // globalThis.removeEventListener("beforeunload", beforeunload_event_func);
        cure.share.EventFunc.remove_event(
          globalThis,
          "beforeunload",
          beforeunload_event_func,
        );
      }
    },
  });
}

/** 解决 toString 检测  hook-Function.prototype.toString-keepOn */
function hook_Function_toString() {
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Function_p_toString",
    obj: Function.prototype,
    property: "toString",
    des: "Function.prototype.toString",
    init_obj: {
      call_handler: function lovejsdebugger_toString(
        _hooked_target: NormalFunction,
      ) {
        // 这里的 this 就是 x.toString() 中的 x 哟
        const o = cure.tool.proxy_handler.get_raw_obj_from_proxy(this);
        try {
          const result = cure.share.ElseFunc.get_func_string(o);
          return result;
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure.tool.stack_handler.curemiracle_handle_proxy_tostring(
            e,
            o,
          );
          throw e;
        }
      },
      call_new_no_log: true,
    },
    default_value: true,
    keep_on: true,
  });
}

// #region helper functions

/** 提取出来的逻辑。**用于报错式检测**。
 *
 * 判断一个 getter 函数是否被重写过。如果重写过还会输出相关信息。
 *
 * 返回 true 表示被重写过，false 表示未被重写过
 *
 */
function curemiracle_check_err_getter(by: string, getter?: NormalFunction) {
  if (!getter) return false;
  const s = cure.share.ElseFunc.get_func_string(getter);
  // 内置函数，不处理
  if (cure.share.StringFunc.includes(s, "{ [native code] }")) return false;
  // 插件赋值的函数，需要处理不让它执行，但不输出后续的相关信息
  if (cure.share.StringFunc.includes(s, "curemiracle_")) return true;

  cure.console.logger.slight_warn(
    "Block CDP",
    `[${by}] block CDP check, Getter:`,
    s,
  );
  return true;
}

/** 提取出来的逻辑。**用于判断是否为报错式检测**
 * 如果是，则输出对应的信息、并返回结果。
 *
 * @param by 用于输出时表示报错的类型
 */
function curemiracle_is_target_error(error: Error, by: string) {
  // 网站很可能给 Error 上的属性添加了 getter，具体有哪些属性见
  // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error
  const mgetter = cure.share.ReflectFunc.getOwnPropertyDescriptor(
    error,
    "message",
  )?.get;
  const sgetter = cure.share.ReflectFunc.getOwnPropertyDescriptor(
    error,
    "stack",
  )?.get;
  const ngetter = cure.share.ReflectFunc.getOwnPropertyDescriptor(
    error,
    "name",
  )?.get;
  const a = curemiracle_check_err_getter(by, mgetter);
  const b = curemiracle_check_err_getter(by, sgetter);
  const c = curemiracle_check_err_getter(by, ngetter);
  return a || b || c;
}

/** 判断一个对象是否为 Error 实例 */
function is_error_obj(obj: object) {
  return obj instanceof Error;
  // 部分网站中 obj 输出时显示它是一个 Error 实例，但通过 instanceof 判断却不是
  // 本来想利用鸭子类型判断，或者使用 `cure.tool.get_type(obj) === 'Error'` 方式判断
  // 反而造成了影响 —— 或者说网站是故意这么做的，我也不清楚为什么，网站代码都混淆了
  // 所以干脆不处理这种特殊情况，到时候直接禁用所有输出就好了
}

// #endregion

export function anti_debugger_00() {
  skip_f12_check();
  skip_devtools_check();
  hook_defineProperty();
  hook_throw_error();
  hook_getOwnPropertyDescriptor();
  hook_SetPrototypeOf();
  stop_redirect();
  hook_Function_toString();
}
