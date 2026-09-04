import cure_console from "../cure-console";
import cure_share from "../cure-share";
import cure_tool from "../cure-tool";
import { BasicPropertyHooker } from "./base";
import { CureLogger } from "./logger";
import { CureDebugger } from "./debugger";

/** hook 属性的方法。
 *
 * 相比较 hook 属性自身，它是更特殊的存在：hook 的属性是一个函数！
 * 相比较 `PropertyHooker` 增加了一些用于函数调用方面的东西。
 *
 * 因为函数不关心读写了哪些属性，所以没有从 `PropertyHooker` 继承。
 */
export class MethodHooker
  extends BasicPropertyHooker
  implements ICureMethodHooker
{
  // #region call function, logger

  /** 保存最新的输出状态，用于还原 */
  #last_call_param_log_state = false;
  /** 函数调用时的参数输出模式，默认开启 */
  readonly #call_param_logger = new CureLogger("call-param", this.des, true);
  set_call_param_logger(on: boolean, v?: DataDisplayer | null) {
    this.#call_param_logger.on = on;
    this.#last_call_param_log_state = on;
    if (v !== undefined) {
      this.#call_param_logger.displayer = v;
    }
    return this;
  }

  /** 保存最新的输出状态，用于还原 */
  #last_call_return_log_state = false;
  /** 函数调用时的返回值输出模式，默认开启 */
  readonly #call_return_logger = new CureLogger("call-return", this.des, true);
  set_call_return_logger(on: boolean, v?: DataDisplayer | null) {
    this.#call_return_logger.on = on;
    this.#last_call_return_log_state = on;
    if (v !== undefined) {
      this.#call_return_logger.displayer = v;
    }
    return this;
  }

  //#endregion

  // #region new function, logger

  /** 保存最新的输出状态，用于还原 */
  #last_new_param_log_state = false;
  /** 函数构造调用时参数的输出模式，默认开启 */
  readonly #new_param_logger = new CureLogger("new-param", this.des, true);
  set_new_param_logger(on: boolean, v?: DataDisplayer | null) {
    this.#new_param_logger.on = on;
    this.#last_new_param_log_state = on;
    if (v !== undefined) {
      this.#new_param_logger.displayer = v;
    }
    return this;
  }

  /** 保存最新的输出状态，用于还原 */
  #last_new_return_log_state = false;
  /** 函数构造调用时返回值的输出模式，默认开启 */
  #new_return_logger = new CureLogger("new-return", this.des, true);
  set_new_return_logger(on: boolean, v?: DataDisplayer | null) {
    this.#new_return_logger.on = on;
    this.#last_new_return_log_state = on;
    if (v !== undefined) {
      this.#new_return_logger.displayer = v;
    }
    return this;
  }

  //#endregion

  // #region call function, debugger
  // 比如传入参数、返回值时，进行断点。而函数有普通调用、构造调用两种形式哟

  /** 函数普通调用时、参数的条件断点，默认关闭 */
  readonly #call_param_debugger = new CureDebugger(false);
  set_call_param_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#call_param_debugger.on = on;
    if (v !== undefined) {
      this.#call_param_debugger.condition = v;
    }
    return this;
  }

  /** 函数普通调用时、返回值的条件断点，默认关闭 */
  readonly #call_return_debugger = new CureDebugger(false);
  set_call_return_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#call_return_debugger.on = on;
    if (v !== undefined) {
      this.#call_return_debugger.condition = v;
    }
    return this;
  }

  //#endregion

  // #region new function, debugger

  /** 函数构造调用时、参数的条件断点，默认关闭 */
  readonly #new_param_debugger = new CureDebugger(false);
  set_new_param_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#new_param_debugger.on = on;
    if (v !== undefined) {
      this.#new_param_debugger.condition = v;
    }
    return this;
  }

  /** 函数构造调用时、返回值的条件断点，默认关闭 */
  readonly #new_return_debugger = new CureDebugger(false);
  set_new_return_debugger(on: boolean, v?: ConditionalDebugger | null) {
    this.#new_return_debugger.on = on;
    if (v !== undefined) {
      this.#new_return_debugger.condition = v;
    }
    return this;
  }

  //#endregion

  // #region call function, handler

  /** 这个纯粹是为了去除动态函数中的 debugger 语句啦 */
  #debugger_statement_handler?: ParamReturnHandler;

  /** 插件内部添加的默认参数处理函数（普通的函数调用）！
   * **只能在初始化本 hooker 时进行设置，此后外部不应该设置它**。
   * 它的作用是：**处理参数，然后返回新的参数**。
   * 比如在去除 debugger 时，就会把 debugger 字符串从参数中移除，并返回新的参数。
   */
  #call_param_handler?: ParamReturnHandler;
  set_call_param_handler(v?: ParamReturnHandler) {
    this.#call_param_handler = v;
    return this;
  }

  /** 这是处理返回值，可以返回一个 “虚假” 的返回值 */
  #call_return_handler?: ParamReturnHandler;
  set_call_return_handler(v?: ParamReturnHandler) {
    this.#call_return_handler = v;
    return this;
  }

  // #endregion

  // #region new function, handler

  /** 插件内部添加的默认参数处理函数（构造函数调用）！ */
  #new_param_handler?: ParamReturnHandler;
  set_new_param_handler(v?: ParamReturnHandler) {
    this.#new_param_handler = v;
    return this;
  }

  #new_return_handler?: ParamReturnHandler;
  set_new_return_handler(v?: ParamReturnHandler) {
    this.#new_return_handler = v;
    return this;
  }

  //#endregion

  // #region function handler

  /** 用于 hook 函数逻辑，比如想要 `hook globalThis.eval` 的函数逻辑，就设置该参数 */
  #call_handler?: CallNewHandler;
  /** 对被 hook 的函数进行重写、或者说装饰（decorate） */
  set_call_handler(v?: CallNewHandler) {
    this.#call_handler = v;
    return this;
  }

  /** 函数作为构造函数调用时的预处理函数 */
  #new_handler?: CallNewHandler;
  /** 当被 hook 的函数作为构造函数调用时进行重写。
   * 注意！传入的函数 v 必须返回一个符合预期的对象！
   *
   * ** 并且传入的函数内部必须手动调用 `new X()` 的形式创建新对象哟！**
   */
  set_new_handler(v?: CallNewHandler) {
    this.#new_handler = v;
    return this;
  }

  // #endregion

  // #region function description
  // 在 hook 一些原型方法时，需要知道到底是哪个对象调用的，故需要一种判断方式咯

  /**
   * 根据函数调用的 this_arg 来完善 _des 属性，添加一些标记信息。
   *
   * 增加该成员的原因：
   *
   * 在 hook Storage.getItem 时（无法直接 hook localSotrage.getItem，所以 hook 它原型链上的访问），
   * 需要在 _des 中指出是 localStorage 还是 sessionSotrage，所以它是根据调用 getItem 时的 this 参数
   * 来确定的，故添加了这个成员函数：根据 this_arg 返回合适的描述信息！
   *
   * 比如 `Storage.getItem(localStorage)` 这样的标记信息。
   *
   * **在输出时，根据该函数的返回值进行输出，不再使用 t._des 成员啦**。
   *
   */
  #description?: HookerDescription;
  set_description(v: HookerDescription) {
    this.#description = v;
    return this;
  }

  // #endregion 设置函数的描述信息

  // #region blink logger

  /**
   * 增加它的原因：在启用 remove_debugger 功能后，Function 等函数在执行时
   * 根本不需要输出参数、返回值等信息，所以此时的 hooker 不需要进行输出，
   * 故增加了该成员：_blink（眨眼）。
   *
   * 如果它为 true，则不进行输出。
   *
   * 使用方法：外部只需要调用 `blink()` 方法，则下一次调用时不会输出参数、返回值的信息。
   */
  #blink = false;
  /** 下一次调用时不会输出参数、返回值等信息。*/
  blink() {
    this.#blink = true;
  }

  // #endregion

  /** 解决无限递归调用的 */
  #call_new_count = 0;
  #check_call_new_count() {
    ++this.#call_new_count;
    if (this.#call_new_count >= cure_tool.constant.maximum_call_stack_size) {
      this.#call_new_count = 0;
      // 检查堆栈是否在无限自调用循环中
      cure_tool.stack_handler.curemiracle_check_self_call_loop(this.des);
    }
  }

  /** 当 hook 停止输出后，通过它来重置！ */
  override reset_log_state() {
    super.reset_log_state();
    this.#call_param_logger.reset_count();
    this.#call_return_logger.reset_count();

    this.#new_param_logger.reset_count();
    this.#new_return_logger.reset_count();

    this.#call_new_count = 0;
    return this;
  }

  constructor(
    obj: NormalFunction,
    property: PropertyKey,
    des: string,
    is_single_obj = false,
  ) {
    super(obj, property, des, is_single_obj);
    // 函数对象通常不关心它访问了哪个属性成员，
    this.set_getter_logger(false);
    this.set_setter_logger(false);
  }

  // #cure-tip 初始化 call、new 成员
  override init(init: MethodHookerInitObj) {
    super.init(init);
    // 设置条件断点，包括函数的参数、返回值两个地方
    init.call_param_debug !== undefined &&
      this.set_call_param_debugger(
        init.call_param_debug,
        init.call_param_debugger,
      );
    init.call_return_debug !== undefined &&
      this.set_call_return_debugger(
        init.call_return_debug,
        init.call_return_debugger,
      );
    init.new_param_debug !== undefined &&
      this.set_new_param_debugger(
        init.new_param_debug,
        init.new_param_debugger,
      );
    init.new_return_debug !== undefined &&
      this.set_new_return_debugger(
        init.new_return_debug,
        init.new_return_debugger,
      );

    // 设置输出格式，包含函数的参数、返回值两个地方
    if (init.call_new_no_log) {
      init.call_param_log = false;
      init.new_param_log = false;
      init.call_return_log = false;
      init.new_return_log = false;
    } else if (init.call_new_param_return_log === true) {
      init.call_param_log = true;
      init.new_param_log = true;
      init.call_return_log = false;
      init.new_return_log = false;
    } else if (init.call_new_param_return_log === false) {
      init.call_param_log = false;
      init.new_param_log = false;
      init.call_return_log = true;
      init.new_return_log = true;
    }
    init.call_param_log !== undefined &&
      this.set_call_param_logger(init.call_param_log, init.call_param_logger);
    init.call_return_log !== undefined &&
      this.set_call_return_logger(
        init.call_return_log,
        init.call_return_logger,
      );
    init.new_param_log !== undefined &&
      this.set_new_param_logger(init.new_param_log, init.new_param_logger);
    init.new_return_log !== undefined &&
      this.set_new_return_logger(init.new_return_log, init.new_return_logger);

    // 设置处理函数，包含函数的参数、返回值两个地方
    init.call_param_handler !== undefined &&
      this.set_call_param_handler(init.call_param_handler);
    init.call_return_handler !== undefined &&
      this.set_call_return_handler(init.call_return_handler);
    init.new_param_handler !== undefined &&
      this.set_new_param_handler(init.new_param_handler);
    init.new_return_handler !== undefined &&
      this.set_new_return_handler(init.new_return_handler);
    init.debugger_statement_handler !== undefined &&
      (this.#debugger_statement_handler = init.debugger_statement_handler);

    // 设置处理函数，包含函数的参数、返回值两个地方
    init.call_handler !== undefined && this.set_call_handler(init.call_handler);
    init.new_handler !== undefined && this.set_new_handler(init.new_handler);

    init.description !== undefined && this.set_description(init.description);

    return this;
  }

  // #region handle parameters and return-value
  // 因为函数调用分为：普通调用、构造函数调用。所以将处理参数、返回值的逻辑提取出来复用！

  /** 处理参数，并返回处理过的参数
   * @param mode 用于标识是普通调用（call）还是构造函数调用（new）
   * @param hook_id 用作是本次 hook 的 id，将来输出时根据它找到相关的调用信息
   */
  #process_params(args: unknown[], mode: "Call" | "New", hook_id: string) {
    const t = this;
    if (!t.#blink) {
      // 输出参数用的
      const logger =
        mode === "Call" ? t.#call_param_logger : t.#new_param_logger;
      // 标记参数的 logo
      const arrow = "->";
      // 输出参数
      if (logger.can_log()) {
        const display_data = logger.display(...args);
        if (display_data !== "") {
          cure_console.logger.log_with_group({
            title: `<id=${hook_id}> [${t.des}] func params(in array)`,
            data: display_data,
            logo: arrow,
          });
        }
      }
    }
    // 条件断点用的
    const condebugger =
      mode === "Call" ? t.#call_param_debugger : t.#new_param_debugger;
    // 处理参数用的
    const handler =
      mode === "Call" ? t.#call_param_handler : t.#new_param_handler;
    // 参数的条件断点
    condebugger.debug(...args);
    // 参数的预处理
    return handler ? handler(...args) : args;
  }

  /** 处理返回值，并返回处理过的返回值 */
  #process_result(result: unknown, mode: "Call" | "New", hook_id: string) {
    const t = this;
    if (!t.#blink) {
      // 输出返回值用的
      const logger =
        mode === "Call" ? t.#call_return_logger : t.#new_return_logger;
      const arrow = "<-";

      // 输出返回值
      if (logger.can_log()) {
        const display_data = logger.display(result);
        if (display_data !== "") {
          cure_console.logger.log_with_group({
            title: `<id=${hook_id}> [${t.des}] func return`,
            data: display_data,
            logo: arrow,
          });
        }
      }
    }
    // 处理返回值用的
    const handler =
      mode === "Call" ? t.#call_return_handler : t.#new_return_handler;
    // 条件断点用的
    const condebugger =
      mode === "Call" ? t.#call_return_debugger : t.#new_return_debugger;
    // 对返回值进行条件断点
    condebugger.debug(result);
    return handler ? handler(result) : result;
  }

  /** 展示函数调用时的相关信息，返回 hook_id */
  #show_cs_info(mode: "Call" | "New", this_arg?: unknown) {
    const t = this;
    /** 增加它表示本次 hook 的 id 哟，用于输出和定位啦 */
    const hook_id = cure_tool.normal.get_hookid();
    if (!t.#blink) {
      const param_logger =
        mode === "Call" ? t.#call_param_logger : t.#new_param_logger;
      const return_logger =
        mode === "Call" ? t.#call_return_logger : t.#new_return_logger;
      // 输出函数调用信息、堆栈
      if (param_logger.can_log() || return_logger.can_log()) {
        // 如果定义了 _descriptor 就调用它，否则使用原来的 _des 咯
        const new_des =
          t.#description && this_arg ? t.#description(this_arg, t.des) : t.des;
        const title = `<id=${hook_id}> [${new_des}]`;
        cure_console.logger.log_with_stack(title, mode);
      }
    }
    return hook_id;
  }

  // #endregion

  // #region Proxy handler

  /** 当函数被调用时触发 */
  protected override curemiracle_apply(
    target: NormalFunction,
    this_arg: unknown,
    argArray: unknown[],
  ) {
    const t = this;
    // 避免 Function.call(Function) 这样的操作时 this 执行 Proxy 对象
    if (this_arg === t) {
      this_arg = target;
    }
    // 取消 hook 时直接返回
    if (t.no_intercept) {
      return cure_share.ReflectFunc.apply(target, this_arg, argArray);
    }

    // 必须提前处理 debugger 语句
    if (t.#debugger_statement_handler) {
      argArray = t.#debugger_statement_handler(...argArray);
    }
    const hook_id = t.#show_cs_info("Call", this_arg);
    argArray = t.#process_params(argArray, "Call", hook_id);

    // #cure-tip 调用拦截函数，得到返回值
    let _target = target;
    // 如果有预处理函数，那么直接调用它，而不会调用 target 啦
    if (t.#call_handler) {
      _target = t.#call_handler;
      // 第一个参数是原来的 target 哟
      argArray = [target, ...argArray];
    }
    let result = cure_share.ReflectFunc.apply(_target, this_arg, argArray);

    // 很可能返回一个 Promise 对象哟！
    if (result instanceof Promise) {
      new cure_share.CurePromise(result).then((v: unknown) =>
        t.#process_result(v, "Call", hook_id),
      );
    } else {
      result = t.#process_result(result, "Call", hook_id);
    }

    t.#blink = false;
    t.#check_call_new_count();
    return result;
  }

  protected override curemiracle_construct(
    target: NormalFunction,
    args: unknown[],
    newTarget?: NormalFunction,
  ) {
    const t = this;
    // 如果 newTarget 存在，则用 newTarget 函数为构造函数
    // 考虑到 newTarget 可能已经被 hook 过了（是一个 Proxy），所以获取底层对象
    if (newTarget) {
      newTarget = cure_tool.proxy_handler.get_raw_obj_from_proxy(newTarget);
    }

    // 必须提前处理 debugger 语句
    if (t.#debugger_statement_handler) {
      args = t.#debugger_statement_handler(...args);
    }
    const hook_id = t.#show_cs_info("New");
    args = t.#process_params(args, "New", hook_id);

    // 调用函数，得到返回值（新创建的对象哟）
    let _target = target;
    let result;
    // 如果有预处理函数，那么直接调用它，而不会调用 target 啦
    if (t.#new_handler) {
      _target = t.#new_handler;
      // 第一个参数是原来的 target 哟
      // 并且调用 _constructor_processor 函数时内部应该使用 new target 返回对象！
      args = [target, ...args];
      result = cure_share.ReflectFunc.apply(_target, undefined, args);
    } else {
      result = cure_share.ReflectFunc.construct(target, args, newTarget);
    }

    result = t.#process_result(result, "New", hook_id);
    t.#blink = false;
    t.#check_call_new_count();
    return result;
  }

  // #endregion

  public override open_hooker_log() {
    const t = this;
    super.open_hooker_log();
    t.#call_param_logger.on = true;
    t.#call_return_logger.on = true;
    t.#new_param_logger.on = true;
    t.#new_return_logger.on = true;
    return t;
  }

  public override restore_hooker_log() {
    const t = this;
    super.restore_hooker_log();
    t.#call_param_logger.on = t.#last_call_param_log_state;
    t.#call_return_logger.on = t.#last_call_return_log_state;
    t.#new_param_logger.on = t.#last_new_param_log_state;
    t.#new_return_logger.on = t.#last_new_return_log_state;
    return t;
  }
}
