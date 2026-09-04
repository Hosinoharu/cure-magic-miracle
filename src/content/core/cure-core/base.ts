import cure_console from "../cure-console";
import cure_share from "../cure-share";
import cure_tool from "../cure-tool";
import { CureLogger } from "./logger";
import { CureDebugger } from "./debugger";
import { PropertyGetterSetterHooker } from "./property-hooker";

/** 有些情况下需要空字符串，用它作为占位符 */
export const empty_str = Symbol.for("curemiracle_empty_string");

/** 最基础的 Hooker 类，整合了通用的、读写属性的 hook 逻辑 */
export abstract class BasicHooker implements ICureHooker {
  // #region normal members

  /** 保存被 hook 后的原始值，可以进行属性描述符的伪造嘛。
   *
   * - 如果 hook 的方式是 `new_obj = new Proxy(obj, {...})`，那么保存的就是 `new_obj`
   * - 如果 hook 的方式是 `Object.defineProperty(obj, property, {...})`
   *    - 属性描述符具备 value 值，那么保存的就是 `obj` 对象。
   *    - 属性描述符具备 getter/setter，那么保存的就是 `undefined`，后续实际触发读写时，会调用 getter 来获取真正的内容啦
   *
   * 如果要还原被 hook 的属性，应该使用 `_release_value`，它始终保存真正的原始对象用于还原！
   */
  #raw_value: unknown;
  protected get raw_value() {
    return this.#raw_value;
  }
  protected set raw_value(v: unknown) {
    this.#raw_value = v;
  }

  /** 记录最开始 hook 时的原始值，用于还原。
   * - 且仅当触发 setter 时才更新 _release_value（说明是网站改动了它）
   * - 当需要还原被 hook 的属性时，使用此值进行还原就可以了
   *
   * **如果具备 raw_getter/raw_setter，那么不需要使用本字段**。
   */
  #release_value?: unknown;
  /** 获取真正用于还原 hook 的值 */
  protected get release_value() {
    return this.#release_value || this.#raw_value;
  }

  /** 记录被 hook 属性的原始属性描述符。
   * 如果取值为 `undefined`，说明要 hook 的属性并不存在于该对象上！
   */
  #raw_descriptor?: PropertyDescriptor;
  protected get raw_descriptor() {
    return this.#raw_descriptor;
  }

  /** 记录被 hook 的对象 obj[property] 底层的 getter、setter。*/
  #raw_getter?: () => unknown;
  protected get raw_getter() {
    return this.#raw_getter;
  }

  #raw_setter?: (v: unknown) => void;
  protected get raw_setter() {
    return this.#raw_setter;
  }

  /** 当前要 hook 的 `obj.x` 是否具备 getter 或 setter */
  protected get has_getter_or_setter() {
    return this.#raw_getter !== undefined || this.#raw_setter !== undefined;
  }

  /** 是否为单一对象 —— 仅用于 hook 对象的时候有用，所以默认为 false。
   *
   * 简单来说就是：传入 obj 后可以不 hook 它，而是调用 `.get_hooker()` 获取它的 Proxy 对象，
   * 然后赋值给 obj 自身而已。
   *
   * 如果 is_single_obj 为 true，那么 property 会是一个描述性字符串，通常为 _obj 的名字哟。
   * 此时只能通过调用 .get_hooker() 获取一个 Proxy 对象进行赋值。
   */
  readonly #is_single_obj;

  /** 用于标记是否进行了 hook，避免重新 hook。为 true 表示已经 hook 了 */
  #is_hooked = false;
  /** 为 true 表示取消 hook 的逻辑，它并不是彻底放弃 hook，而是不进行拦截、输出等操作。
   *
   * 比如取消 `hook globalThis.eval` 后，其实依然保留了 hook 功能，但不再进行任何处理。
   *
   * **要想彻底取消 hook，应该停用本插件**。
   */
  #no_intercept = false;
  protected get no_intercept() {
    return this.#no_intercept;
  }

  /** 记录调用了多少次读写 hook，当超过一定次数，就要检查是否存在无限循环 */
  #getter_setter_count = 0;

  // #endregion

  /**
   * 以 `hook globalThis.eval` 为例。
   * - `_obj` 就是 `globalThis` 对象
   * - `_property` 就是 `"eval"`
   * - `_des` 就是 `"globalThis.eval"`。
   * @param obj 要 hook 该 obj 对象的某个数据属性或方法
   * @param property 要 hook obj 对象的某个属性的名字
   * @param des 保存有关该 Hook 的信息。通常它是对象名称 + 属性名称。
   */
  constructor(
    private readonly obj: object,
    private readonly property: PropertyKey,
    protected readonly des: string,
    is_single_obj = false,
  ) {
    this.#getter_logger = new CureLogger("get", this.des, true);
    this.#setter_logger = new CureLogger("set", this.des, true);
    this.#is_single_obj = is_single_obj;
  }

  /** 初始化 raw_value，以及属性描述符。必须在 `hook_it` 中调用！
   *
   * 也就是说，**在每次开始 `hook` 时，需要重新获取其 raw_value` 才行！
   */
  #init_raw_value() {
    if (this.#is_single_obj) {
      this.#raw_value = this.obj;
      this.#release_value = this.obj;
      return;
    }

    this.#raw_descriptor = cure_share.ObjectFunc.getOwnPropertyDescriptor(
      this.obj,
      this.property,
    );

    // #cure-ques 为什么要原型链查找？？
    [this.#raw_getter, this.#raw_setter] =
      cure_tool.normal.lookup_getter_setter(this.obj, this.property);

    // 如果有 getter/setter，则此处不能初始化 raw_value
    // 因为 obj[property] 的值后续可能被修改，必须实时获取最新的值
    if (!this.has_getter_or_setter) {
      this.#raw_value = cure_share.ReflectFunc.get(this.obj, this.property);
      this.#release_value = this.#raw_value;
    }
  }

  // #region handle get/set logger

  /** 保存最近一次的 getter log statte，用于还原 */
  #last_getter_log_state = false;
  /** 读取内容时的输出器，默认启用 */
  readonly #getter_logger: CureLogger;
  /** 能否在 getter 时输出内容 */
  protected get is_getter_log_on() {
    return this.#getter_logger.on;
  }
  set_getter_logger(on: boolean, v?: DataDisplayer | null) {
    this.#getter_logger.on = on;
    this.#last_getter_log_state = on;
    if (v !== undefined) {
      this.#getter_logger.displayer = v;
    }
    return this;
  }

  /** 保存最近一次的 setter log statte，用于还原 */
  #last_setter_log_state = false;
  /** 设置内容时的输出器，默认启用 */
  readonly #setter_logger: CureLogger;
  /** 能否在 setter 时输出内容 */
  protected get is_setter_log_on() {
    return this.#setter_logger.on;
  }
  set_setter_logger(on: boolean, v?: DataDisplayer | null) {
    this.#setter_logger.on = on;
    this.#last_setter_log_state = on;
    if (v !== undefined) {
      this.#setter_logger.displayer = v;
    }
    return this;
  }

  //#endregion

  // #region handle get/set debugger
  // 比如，读取属性值时，可以断点。设置属性值时，也可以断点

  /** 读取内容时的条件断点 */
  readonly #getter_debugger = new CureDebugger(false);
  set_getter_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#getter_debugger.on = on;
    if (v !== undefined) {
      this.#getter_debugger.condition = v;
    }
    return this;
  }

  /** 设置内容时的条件断点。默认不断点 */
  readonly #setter_debugger = new CureDebugger(false);
  set_setter_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#setter_debugger.on = on;
    if (v !== undefined) {
      this.#setter_debugger.condition = v;
    }
    return this;
  }

  // #endregion

  // #region handle get/set handler

  /** 读取属性值时进行拦截，返回想要的返回值 */
  #getter_handler?: GetterSetterHandler;
  set_getter_handler(v?: GetterSetterHandler) {
    this.#getter_handler = v;
    return this;
  }

  /** 设置属性值时，处理该值 */
  #setter_handler?: GetterSetterHandler;
  set_setter_handler(v?: GetterSetterHandler) {
    this.#setter_handler = v;
    return this;
  }

  //#endregion

  // #region helper functions

  // #cure-tip 初始化内部成员
  /** 通过传入对象来进行初始化，避免调用一系列的 .set 方法 */
  init(init: IBaseHookerInitObj) {
    if (init.getter_setter_no_log) {
      init.getter_log = false;
      init.setter_log = false;
    }
    init.getter_log !== undefined &&
      this.set_getter_logger(init.getter_log, init.getter_logger);
    init.setter_log !== undefined &&
      this.set_setter_logger(init.setter_log, init.setter_logger);
    init.getter_debug !== undefined &&
      this.set_getter_debugger(init.getter_debug, init.getter_debugger);
    init.setter_debug !== undefined &&
      this.set_setter_debugger(init.setter_debug, init.setter_debugger);
    return this;
  }

  /** 抽象出来的代码。获取对应模式的 logger、debugger、handler、箭头指向 */
  #get_mode_things(mode: "Get" | "Set") {
    const logger = mode === "Get" ? this.#getter_logger : this.#setter_logger;
    const condebugger =
      mode === "Get" ? this.#getter_debugger : this.#setter_debugger;
    const handler =
      mode === "Get" ? this.#getter_handler : this.#setter_handler;
    /** 表示数据的获取方向啦 */
    const arrow = mode === "Get" ? "<-" : "->";
    return { logger, condebugger, handler, arrow };
  }

  /** 检查是否出现了无限循环调用 —— 处理反调试的 */
  #check_getter_setter_count() {
    ++this.#getter_setter_count;
    if (
      this.#getter_setter_count >= cure_tool.constant.maximum_call_stack_size
    ) {
      this.#getter_setter_count = 0;
      // 检查堆栈是否在无限自调用循环中
      cure_tool.stack_handler.curemiracle_check_self_call_loop(this.des);
    }
  }

  reset_log_state() {
    this.#getter_logger.reset_count();
    this.#setter_logger.reset_count();
    this.#getter_setter_count = 0;
    return this;
  }

  open_hooker_log() {
    this.#getter_logger.on = true;
    this.#setter_logger.on = true;
    this.reset_log_state();
    return this;
  }

  restore_hooker_log(): this {
    this.#getter_logger.on = this.#last_getter_log_state;
    this.#setter_logger.on = this.#last_setter_log_state;
    return this;
  }

  // #endregion

  // #region about hook functions

  /** 抽象出来的方法，用于处理取值时或设置值的 value、然后返回新的 value 哟
   * @param mode 'Get' | 'Set'，表示是取值还是设置值操作
   * @param value 取值或设置值时的 value
   */
  protected curemiracle_process_value(
    mode: "Get" | "Set",
    value: unknown,
    property?: PropertyKey,
  ) {
    if (this.#no_intercept) return value;

    const value_type = cure_tool.normal.get_type(value);
    const hook_id = cure_tool.normal.get_hookid();
    const { logger, condebugger, handler, arrow } = this.#get_mode_things(mode);

    // 对值是否进行输出
    if (logger.can_log()) {
      // 如 `[Get] globalThis.xxx-- - Type: object`
      const insert_s = property
        ? `.${cure_share.ElseFunc.to_normal_string(property)}`
        : "";
      const title = `<id=${hook_id}> [${this.des}${insert_s}] --- Type: ${value_type}`;
      cure_console.logger.log_with_stack(title, mode);

      const display_data = logger.display(value);
      if (display_data !== "") {
        cure_console.logger.log_with_group({
          logo: arrow,
          title: `<id=${hook_id}> [${this.des}${insert_s}] ${mode} value`,
          data: display_data,
        });
      }
    }
    // 对值进行条件断点
    condebugger.debug(value);
    this.#check_getter_setter_count();
    // 预处理值
    return handler ? handler(value) : value;
  }

  /** 在触发 getter 时调用的代码，对获取到的值进行输出、断点等。
   * 如果取消了 hook 则不会执行到这里哟 */
  protected curemiracle_when_get(v: unknown) {
    return this.curemiracle_process_value("Get", v);
  }
  /** 在触发 setter 时调用的代码，对获取到的值进行输出、断点等。
   * 如果取消了 hook 则不会执行到这里哟 */
  protected curemiracle_when_set(v: unknown) {
    return this.curemiracle_process_value("Set", v);
  }

  /** 在 hook 对象时设置的 getter，此时已经更新了 raw_value.
   * @param _this 调用 getter 时的对象
   */
  #curemiracle_initial_getter(_this: unknown) {
    // 取消 hook 时，直接返回值，不进行任何处理
    if (!this.#no_intercept) {
      this.curemiracle_when_get(this.#raw_value);
    }
    return this.#raw_value;
  }

  /** 在 hook 对象时设置的 setter，此时已经更新了 raw_value
   * @param _this 调用 setter 时的对象
   */
  #curemiracle_initial_setter(_this: unknown, v: unknown) {
    this.#raw_value = v;
    this.#release_value = v;
    // 网站修改了原本的值，那么也要更新保存的、属性描述符
    this.#raw_descriptor && (this.#raw_descriptor.value = v);

    // 取消 hook 时，直接返回值，不进行任何处理
    if (!this.#no_intercept) {
      this.curemiracle_when_set(v);
    }
    return true;
  }
  /** 用于在 hook 对象之前调用，比如 hook 自身属性、更新 t.raw_value 等等
   * 在 is_single_obj 为 true 时返回被处理过的 t._raw_value */
  protected abstract get_hooker(): unknown;
  /** 在 get_hooker 之前进行一些检查，子类必须在 get_hooker 之前调用它 */
  protected before_get_hooker() {
    this.#init_raw_value();
    // 如果具备 getter/setter，则直接 hook 它们了，raw_value 则为 undefined
    // 所以这里只是确保一切正常
    if (this.raw_value === undefined && !this.has_getter_or_setter) {
      throw new cure_share.CureError(
        "raw_value is undefined, and no getter/setter",
      );
    }
  }

  /** 在 hook 函数时重写了它的 .prototype.constructor 属性，当 release hooker 时，需要调用本函数来重置咯。
   *
   * **本方法仅留给 hook 对象时重写！**
   */
  protected reset_constructor(): void {}

  /** 默认的 hook 方式
   * - 如果属性具备 getter/setter，则 hook 它们
   * - 否则，强制添加 getter/setter 监控其读写！
   */
  #normal_hook() {
    const self = this;

    // 没有 getter/setter 直接强制添加 getter/setter 监控
    if (!self.has_getter_or_setter) {
      cure_share.ObjectFunc.defineProperty(self.obj, self.property, {
        get: function curemiracle_initial_get() {
          // #cure-warn 原型链触发的读写问题
          // 比如现在 hook 了 obj.x 属性，该属性具备 getter/setter 咯
          // 而 temp 的原型就是 obj 本身！
          // 那么 temp.x 访问时，如果它自身没有 x 属性，就会访问到 obj.x 的 getter！！
          // 其实不用多管，既然能访问到这里，那就处理呗
          // const is_self = this === t._obj;
          return self.#curemiracle_initial_getter(this); // 一定要传入 this
        },
        set: function curemiracle_initial_set(v) {
          // #cure-warn 原型链触发的读写问题
          // 比如现在 hook 了 obj.x 属性，该属性具备 getter/setter 咯
          // 而 temp 的原型就是 obj 本身！
          // 那么 `temp.x = 2` 访问时，如果它自身没有 x 属性，就会访问到 obj.x 的 setter！！
          // 那么应该直接给 temp 添加 x 属性，而不是修改 obj.x 的值啦
          const is_self = this === self.obj;
          if (!is_self) {
            // 注意了！此处应该使用 defineProperty 设置，
            // 而不是直接赋值、Reflect.set 等，否则会出现无限递归循环的！
            // return cure_share.ReflectFunc.set(this, t._property, v);
            return cure_share.ObjectFunc.defineProperty(this, self.property, {
              // 默认赋值就是用这个属性描述符的
              value: v,
              writable: true,
              enumerable: true,
              configurable: true,
            });
          }
          // 自赋值的情况，即 x = x 的情况
          else if (self.#raw_value === v) {
            return v;
          }

          return self.#curemiracle_initial_setter(this, v);
        },
        enumerable: self.#raw_descriptor?.enumerable,
        configurable: true,
      });
    }
    // 否则，hook getter/setter 然后设置回去
    else {
      const new_getter =
        self.#raw_getter &&
        new PropertyGetterSetterHooker(
          self.#raw_getter,
          `${self.des} <getter>`,
          true,
          {
            process_value(mode: "Get" | "Set", value: unknown) {
              return self.curemiracle_process_value(mode, value);
            },
          },
        ).get_hooker();

      const new_setter =
        self.#raw_setter &&
        new PropertyGetterSetterHooker(
          self.#raw_setter,
          `${self.des} <setter>`,
          false,
          {
            process_value(mode: "Get" | "Set", value: unknown) {
              return self.curemiracle_process_value(mode, value);
            },
          },
        ).get_hooker();

      cure_share.ObjectFunc.defineProperty(self.obj, self.property, {
        get: new_getter as NormalFunction,
        set: new_setter as NormalFunction,
        enumerable: self.#raw_descriptor?.enumerable,
        configurable: true,
      });
    }
  }

  //#endregion

  is_hooked() {
    return this.#is_hooked;
  }

  hook_it() {
    if (this.#is_single_obj) {
      throw new cure_share.CureError(
        `Can't call hook_it(), only return hooker: ${this.des}`,
      );
    }
    // 如果已经取消了 hook，那么重新恢复 hook 即可
    if (this.#no_intercept) {
      this.#no_intercept = false;
    }
    // 已经 hook 过了，那就不需要额外处理了
    if (this.#is_hooked) return this;

    // 先删除该属性，因为部分网站居然无法定义 get/set，因为它还具备 value、writable 属性
    // 不用慌张，在删除该属性之前已经将它的值保存到了 _raw_value 了
    // cure_share.ReflectFunc.deleteProperty(t._obj, t._property);
    this.get_hooker();
    this.#normal_hook();
    cure_tool.property_handler.set_hooked_property(this.obj, this.property);
    this.#is_hooked = true;
    return this;
  }

  /** 取消 hook 的处理、输出，但依然保留 Hook 功能存在 */
  unhook_it() {
    if (this.#is_single_obj) {
      throw new cure_share.CureError(
        `Can't call hook_it(), only return hooker: ${this.des}`,
      );
    }
    if (this.#is_hooked) {
      this.#no_intercept = true;
    }
    return this;
  }

  release() {
    if (this.#is_released()) return this;

    if (this.#is_hooked) {
      this.unhook_it();
      this.#is_hooked = false;
    }
    // 如果原来的属性具备有 getter、setter，那么就恢复它
    if (this.has_getter_or_setter) {
      cure_share.ObjectFunc.defineProperty(this.obj, this.property, {
        get: this.#raw_getter,
        set: this.#raw_setter,
        enumerable: this.#raw_descriptor?.enumerable,
        configurable: true,
      });
    } else {
      this.reset_constructor(); // 如果 hook 的是函数会重置 .prototype.constructor
      // release 的时候优先使用 release_value 哟
      cure_share.ObjectFunc.defineProperty(this.obj, this.property, {
        value: this.release_value,
        configurable: true,
        writable: this.#raw_descriptor?.writable,
        enumerable: this.#raw_descriptor?.enumerable,
      });
    }

    this.#after_release();
    return this;
  }

  #is_released() {
    return (
      this.#raw_value === undefined &&
      this.#release_value === undefined &&
      this.#raw_getter === undefined &&
      this.#raw_setter === undefined
    );
  }

  /** release 之后重置关于 hook 的状态 */
  #after_release() {
    this.#raw_value = undefined;
    this.#release_value = undefined;
    this.#raw_getter = undefined;
    this.#raw_setter = undefined;
    this.#raw_descriptor = undefined;
    this.#no_intercept = false;
    this.#is_hooked = false;
    this.reset_log_state();
  }
}

/** 抽象出来的代码，因为后续的继承原因，将重复的提取出来 */
export class BasicPropertyHooker extends BasicHooker {
  constructor(
    obj: object,
    property: PropertyKey,
    des: string,
    is_single_obj = false,
  ) {
    super(obj, property, des, is_single_obj);
  }

  /** 获取自身的时候不需要做什么事情 */
  protected override curemiracle_when_get(_: unknown) {}

  /** 设置自身的时候需要警告！ */
  protected override curemiracle_when_set(v: unknown) {
    cure_console.logger.slight_warn(
      "Change hooker",
      `[${this.des}]. set value:`,
      v,
    );
  }

  // 除了 Get、Set 以外，其它的 handler 只有 _log_mode !== 'not'，则一定要输出内容！

  /** 重构后的产物，提取了下面 handler 中重复的代码而已，用于输出是哪些 handler 执行的操作
   * @param operation 记录是哪些操作。比如 Get Prototype 等等
   * @param info 关于本次操作的内容，比如访问了哪个属性呀之类的，通常是 `this._des + 操作的属性名`。
   * @param arg 关于本次操作的其它信息。比如设置属性描述符时，arg 就是这个属性描述符对象咯
   *
   * 形如 `[Get Prototype]globalThis.XX \n arg \n stack`
   */
  #log_operation(operation: string, info: string, arg?: unknown) {
    if (this.no_intercept || this.is_getter_log_on) return;

    let s = "";
    if (arg !== undefined) {
      s =
        typeof arg === "string"
          ? arg
          : cure_tool.stringifier.to_json_string(arg);
    }
    const title = `${info}\n${s}`;
    cure_console.logger.log_with_stack(title, operation);
  }

  // #region Proxy handler
  // 只实现了常用的几个，忽略 isExtensible()、preventExtensions()。需要的时候再说吧。另外有关函数调用的逻辑不在这里

  // 获取属性、设置属性的逻辑由子类重写，其它默认就好啦

  /** 子类重写。读取属性，对应 Proxy.get
   * @param target 代理的目标，即 this.raw_value
   * @param property 访问 target 的某个属性
   * @param receiver 代理本身
   */
  protected curemiracle_get_property(
    target: object,
    property: PropertyKey,
    receiver?: unknown,
  ) {
    // receiver = cure_tool.proxy.get_raw_obj_from_proxy(receiver);
    return cure_share.ReflectFunc.get(target, property, receiver);
  }

  /** 子类重写。设置属性，对应 Proxy.set。
   *
   * 如果当前属性 target[property] 是一个 hook 过的对象（即 Proxy），
   *
   * 则它会先执行这里，而是走其属性描述符中的 setter 逻辑
   */
  protected curemiracle_set_property(
    target: object,
    property: PropertyKey,
    value: unknown,
    receiver?: unknown,
  ) {
    // receiver = cure_tool.proxy.get_raw_obj_from_proxy(receiver);
    return cure_share.ReflectFunc.set(target, property, value, receiver);
  }

  private curemiracle_get_prototype_of(target: object) {
    this.#log_operation("Get Prototype", this.des);
    return cure_share.ReflectFunc.getPrototypeOf(target);
  }

  private curemiracle_set_prototype_of(target: object, proto: object | null) {
    this.#log_operation("Set Prototype", this.des, proto);
    return cure_share.ReflectFunc.setPrototypeOf(target, proto);
  }

  private curemiracle_get_own_property_descriptor(
    target: object,
    property: PropertyKey,
  ) {
    this.#log_operation(
      "Get Own Property Descriptor",
      `${this.des}.${cure_share.ElseFunc.to_normal_string(property)}`,
    );
    return cure_share.ReflectFunc.getOwnPropertyDescriptor(target, property);
  }

  /**
   * 当调用 defineProperty 时会作用到底层的 target 中，
   * 但是 writable、configurable 一定要为 true 哟。
   *
   * 这算是暴露一种方式可以直接修改底层 target，嗯……建议还是自己使用吧。
   * 对于，如果对 Proxy 对象进行 Object.defineProperty，其首先会经过 define_property（重写的），
   * 然后才会进入到这里！
   */
  private curemiracle_define_property(
    target: object,
    property: PropertyKey,
    attributes: PropertyDescriptor,
  ) {
    this.#log_operation(
      "Define Property",
      `${this.des}.${cure_share.ElseFunc.to_normal_string(property)}`,
      attributes,
    );
    return cure_share.ReflectFunc.defineProperty(target, property, attributes);
  }

  /** 子类重写。一个普通对象执行函数调用肯定报错嘛 */
  protected curemiracle_apply(
    target: NormalFunction,
    this_arg: unknown[],
    args: unknown[],
  ) {
    return cure_share.ReflectFunc.apply(target, this_arg, args);
  }

  /** 子类重写。一个普通对象执行构造函数调用肯定报错嘛 */
  protected curemiracle_construct(
    target: NormalFunction,
    argumentsList: unknown[],
    newTarget?: NormalFunction,
  ): unknown {
    return cure_share.ReflectFunc.construct(target, argumentsList, newTarget);
  }

  private curemiracle_delete_property(
    target: object,
    property: PropertyKey,
  ): boolean {
    this.#log_operation(
      "Delete Property",
      `${this.des}.${cure_share.ElseFunc.to_normal_string(property)}`,
    );
    return cure_share.ReflectFunc.deleteProperty(target, property);
  }

  private curemiracle_own_keys(target: object): Array<string | symbol> {
    this.#log_operation("Get Own Keys", this.des);
    return cure_share.ReflectFunc.ownKeys(target);
  }

  private curemiracle_has(target: object, property: PropertyKey): boolean {
    this.#log_operation(
      "Has",
      `${this.des}.${cure_share.ElseFunc.to_normal_string(property)}`,
    );
    return cure_share.ReflectFunc.has(target, property);
  }

  // #endregion

  /** 创建底层 Proxy 代理、赋值给 raw_value 并返回！ */
  override get_hooker() {
    const self = this;
    self.before_get_hooker();
    const p = cure_tool.proxy_handler.create_proxy(self.raw_value as object, {
      get: function curemiracle_get_entry(...args: unknown[]) {
        const [target, property, receiver] = args as [
          object,
          PropertyKey,
          unknown,
        ];

        const is_self = p === receiver;

        // 访问特定的属性，返回原始对象
        if (property === cure_tool.constant.proxy_raw_obj_symbol) {
          return is_self ? target : undefined;
        }
        // 访问特定的属性，返回原始的属性描述符
        if (property === cure_tool.constant.proxy_raw_descriptor_symbol) {
          return is_self ? self.raw_descriptor : undefined;
        }
        // 访问特定的属性，返回该 Proxy 的描述信息
        if (property === cure_tool.constant.proxy_description_symbol) {
          return is_self ? self.des : undefined;
        }

        // #cure-warn 原型链触发的读写问题
        // 如果不是自己在读取，那就是在读取时访问了原型链，此时应该输出吗？
        // 还是输出吧，毕竟也是的的确确读到了这个东西，但需要提前判断是否存在该属性
        // 如果存在就继续并触发日志咯，否则就继续向上找
        if (!is_self && !cure_share.ReflectFunc.has(target, property)) {
          return cure_share.ReflectFunc.get(target, property, receiver);
        }

        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_get_property,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e as Error,
            `${self.des} proxy handler <getter>`,
          );
          throw e;
        }
      },
      set: function curemiracle_set_entry(...args: unknown[]) {
        const [target, property, value, receiver] = args as [
          object,
          PropertyKey,
          unknown,
          object,
        ];
        const is_self = p === receiver;

        // #cure-warn 原型链触发的读写问题
        // 如果不是自己在赋值，那么就是在赋值时访问了原型链，此时不需要输出了
        // 但也不要修改做过多操作，直接还原操作就可以了
        if (!is_self) {
          return cure_share.ReflectFunc.set(target, property, value, receiver);
        }

        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_set_property,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `${self.des} proxy handler <setter>`,
          );
          throw e;
        }
      },
      defineProperty: function curemiracle_define_property_entry(
        ...args: unknown[]
      ) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_define_property,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <defineProperty>`,
          );
          throw e;
        }
      },
      deleteProperty: function curemiracle_delete_property_entry(
        ...args: unknown[]
      ) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_delete_property,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <deleteProperty>`,
          );
          throw e;
        }
      },
      getOwnPropertyDescriptor:
        function curemiracle_get_own_property_descriptor_entry(
          ...args: unknown[]
        ) {
          // 外部使用 `.hasOwnProperty` 来判断是否为 Proxy 对象
          // 所以会触发这个方法，所以碰到对应的属性直接返回 true
          // 为什么不直接在 `proxy getter` 中处理？
          // 因为网站对抗中，很可能会触发网站自己写的 getter，所以只好在这里了
          if (args[1] === cure_tool.constant.proxy_raw_obj_symbol) {
            // 这里返回一个虚假对象就可以了
            const obj = cure_share.ElseFunc.create_clean_object({
              value: "this is a fake object for proxy_raw_obj_symbol",
              configurable: true,
              enumerable: false,
              writable: false,
            });
            return obj;
          }
          try {
            return cure_share.ReflectFunc.apply(
              self.curemiracle_get_own_property_descriptor,
              self,
              args,
            );
          } catch (_e: unknown) {
            const e = _e as Error;
            e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
              e,
              `[${self.des}] proxy handler <getOwnPropertyDescriptor>`,
            );
            throw e;
          }
        },
      getPrototypeOf: function curemiracle_get_prototype_of_entry(
        ...args: unknown[]
      ) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_get_prototype_of,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <getPrototypeOf>`,
          );
          throw e;
        }
      },
      setPrototypeOf: function curemiracle_set_prototype_of_entry(
        ...args: unknown[]
      ) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_set_prototype_of,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <setPrototypeOf>`,
            true,
          );
          throw e;
        }
      },
      apply: function curemiracle_apply_entry(...args: unknown[]) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_apply,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <apply>`,
          );
          throw e;
        }
      },
      construct: function curemiracle_construct_entry(...args: unknown[]) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_construct,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <construct>`,
          );
          throw e;
        }
      },
      ownKeys: function curemiracle_own_keys_entry(...args: unknown[]) {
        try {
          return cure_share.ReflectFunc.apply(
            self.curemiracle_own_keys,
            self,
            args,
          );
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <ownKeys>`,
          );
          throw e;
        }
      },
      has: function curemiracle_has_entry(...args: unknown[]) {
        try {
          return cure_share.ReflectFunc.apply(self.curemiracle_has, self, args);
        } catch (_e: unknown) {
          const e = _e as Error;
          e.stack = cure_tool.stack_handler.curemiracle_get_faker_stack(
            e,
            `[${self.des}] proxy handler <has>`,
          );
          throw e;
        }
      },
    });

    // 如果代理的属性（比如 `hook globalThis.eval`）是一个函数
    // 则要让它的 prototype.constructor 指向 v 哟
    const raw_value = self.raw_value as {
      prototype?: object;
    };
    if (
      raw_value &&
      cure_share.ObjectFunc.hasOwn(raw_value, "prototype") &&
      raw_value.prototype !== undefined
    ) {
      cure_share.ObjectFunc.defineProperty(raw_value.prototype, "constructor", {
        value: p,
        enumerable: false,
        configurable: true,
      });
    }
    self.raw_value = p;
    return p;
  }

  protected override reset_constructor() {
    const release_value = this.release_value as {
      prototype?: object;
    };
    // 如果代理的属性（比如 `hook globalThis.eval`）是一个函数
    // 则要让它的 prototype.constructor 指向原来的值哟
    if (
      cure_share.ObjectFunc.hasOwn(release_value, "prototype") &&
      release_value.prototype !== undefined
    ) {
      cure_share.ObjectFunc.defineProperty(
        release_value.prototype,
        "constructor",
        {
          value: release_value,
          enumerable: false,
          configurable: true,
        },
      );
    }
  }
}
