/* eslint-disable @typescript-eslint/no-explicit-any */

/** 在创建 CoreLogger 时，表示该 logger 输出是 get/set 还是什么操作。
 * 是输出函数调用、函数调用的参数、返回值等等
 */
type LoggerType =
  | "get"
  | "set"
  | "call-param"
  | "call"
  | "call-return"
  | "new-param"
  | "new"
  | "new-return";

/** 在 hook 数据属性、将属性值输出到控制台时需要将其中的内容展开，
 * 这样才能在控制台中进行搜索、快速定位。
 */
type DataDisplayer = NormalFunction<unknown>;

/** 在 hook 时，如果想在属性值满足某个条件时进行断点，那么应该传入一个本类型的函数。
 * 默认情况下转为一个字符串再来处理！如果是复杂类型应该临时编写脚本！
 */
type ConditionalDebugger = NormalFunction<unknown, boolean>;

/** 用于处理 getter 取值、setter 设置值时，可以返回新的值。
 *
 * @param raw 表示获取到的值、或者要设置的值
 */
type GetterSetterHandler<T = any> = (raw: T) => any;

/** 用于处理函数调用时的参数、返回值哟 */
type ParamReturnHandler = NormalFunction;

/** 一个 Hooker 应当具备的东西 */
interface ICureHooker {
  /** 初始化内部成员 */
  init(o: any): this;

  /** 设置 gettter 时输出值的逻辑。传入 null 表示删除原本的 logger */
  set_getter_logger(on: boolean, v?: DataDisplayer | null): this;
  /** 设置 setter 时输出值的逻辑 */
  set_setter_logger(on: boolean, v?: DataDisplayer | null): this;

  /** 设置 getter 时进行断点，传入在什么时候断点，以及断点的条件。
   *
   * @param v 传入 null 表示取消之前的条件断点。传入 `undefined` 没什么效果哟
   */
  set_getter_debugger(on: boolean, v?: ConditionalDebugger | null): this;
  /** 设置 setter 时进行断点 */
  set_setter_debugger(on: boolean, v?: ConditionalDebugger | null): this;

  /** 设置 getter 时值的 hook，返回一个新的值 */
  set_getter_handler(v?: GetterSetterHandler): this;
  /** 设置 setter 时值的 hook，设置一个新的值 */
  set_setter_handler(v?: GetterSetterHandler): this;

  /** 当 hook 因为超出最大输出限制、停止输出后，通过它来重置！ */
  reset_log_state(): this;
  /** 开启 hooker 的所有输出，便于调试 */
  open_hooker_log(): this;
  /** 还原 hooker 的之前的输出格式 */
  restore_hooker_log(): this;
  /** 启用 hook */
  hook_it(): this;
  /** 取消 hook */
  unhook_it(): this;
  /** 判断当前 hooker 是否开启 hook 了 */
  is_hooked(): boolean;
  /** 真正取消 hook，这是为了取消 eval、setInterval 等动态生成函数而设置的 */
  release(): this;
}

interface IBaseHookerInitObj {
  /** 一个综合属性。将它设置为 true 将禁用 getter、setter 的输出 */
  getter_setter_no_log?: true;
  /** 读取属性时，输出读取的值 */
  getter_log?: boolean;
  /** 输出读取的内容，默认使用 json 展示，可以忽略 */
  getter_logger?: DataDisplayer;
  setter_log?: boolean;
  setter_logger?: DataDisplayer;

  /** 读取属性时，进行条件断点 */
  getter_debug?: boolean;
  /** 条件断点函数哟 */
  getter_debugger?: ConditionalDebugger;
  setter_debug?: boolean;
  setter_debugger?: ConditionalDebugger;
}

/** 由对象 Hooker 传给其 getter/setter Hooker 时的东西，用于获取、更新对象 Hooker 哟 */
type BindHooker = {
  /** 对象 Hooker 传过来的，仅由该 getter/setter hook 调用，触发对象 Hooker 的 logger、debugger */
  process_value: (mode: "Get" | "Set", value: any) => void;
};

/** 一个用于函数的 Hooker 应该具备的东西 */
interface ICureMethodHooker extends ICureHooker {
  /** 设置函数调用时输出参数的逻辑 */
  set_call_param_logger(on: boolean, v?: DataDisplayer | null): this;
  /** 设置函数构造调用时输出返回值的逻辑 */
  set_new_param_logger(on: boolean, v?: DataDisplayer | null): this;

  /** 设置函数调用时进行对参数进行条件断点 */
  set_call_param_debugger(on: boolean, v?: ConditionalDebugger | null): this;
  /** 设置函数构造调用时进行对参数进行条件断点 */
  set_new_param_debugger(on: boolean, v?: ConditionalDebugger | null): this;

  /** 设置对参数的预处理 */
  set_call_param_handler(v?: ParamReturnHandler): this;
  /** 设置对构造函数参数的预处理 */
  set_new_param_handler(v?: ParamReturnHandler): this;

  /** 设置函数调用时值的 hook */
  set_call_handler(v?: CallNewHandler): this;
  /** 设置函数构造调用时值的 hook */
  set_new_handler(v?: CallNewHandler): this;

  /** 设置函数调用时输出返回值的逻辑 */
  set_call_return_logger(on: boolean, v?: DataDisplayer | null): this;
  /** 设置函数构造调用时输出返回值的逻辑 */
  set_new_return_logger(on: boolean, v?: DataDisplayer | null): this;

  /** 设置函数调用时进行对返回值进行条件断点 */
  set_call_return_debugger(on: boolean, v?: ConditionalDebugger | null): this;
  /** 设置函数构造调用时进行对返回值进行条件断点 */
  set_new_return_debugger(on: boolean, v?: ConditionalDebugger | null): this;

  /** 设置对返回值的预处理 */
  set_call_return_handler(v?: ParamReturnHandler): this;
  /** 设置对构造函数返回值的预处理 */
  set_new_return_handler(v?: ParamReturnHandler): this;

  /** 设置 hooker 的描述信息 */
  set_description(v: HookerDescription): this;
  /** 仅禁用下一次的输出，此后将失效，除非再次调用 */
  blink(): void;
}
interface BasicHookerInitObj {
  /** 一个综合属性。将它设置为 true 将禁用 getter、setter 的输出 */
  getter_setter_no_log?: true;
  /** 读取属性时，输出读取的值 */
  getter_log?: boolean;
  /** 输出读取的内容，默认使用 json 展示，可以忽略 */
  getter_logger?: DataDisplayer;
  setter_log?: boolean;
  setter_logger?: DataDisplayer;

  /** 读取属性时，进行条件断点 */
  getter_debug?: boolean;
  /** 条件断点函数哟 */
  getter_debugger?: ConditionalDebugger;
  setter_debug?: boolean;
  setter_debugger?: ConditionalDebugger;
}

type PropertyHookerInitObj = BasicHookerInitObj;

interface MethodHookerInitObj extends PropertyHookerInitObj {
  /** 是否在调用时（参数阶段）进行条件断点。 */
  call_param_debug?: boolean;
  call_param_debugger?: ConditionalDebugger;
  /** 是否在调用时（返回值阶段）进行条件断点 */
  call_return_debug?: boolean;
  call_return_debugger?: ConditionalDebugger;

  /** 构造函数调用时（参数阶段）进行条件断点 */
  new_param_debug?: boolean;
  new_param_debugger?: ConditionalDebugger;
  /** 构造函数调用时（返回值阶段）进行条件断点 */
  new_return_debug?: boolean;
  new_return_debugger?: ConditionalDebugger;

  /** 一个综合属性。默认情况下，函数会输出参数、返回值。
   * 将它设置为 true 将取消所有参数、返回值的输出。不设置它就没有效果咯
   */
  call_new_no_log?: true;
  /** 综合设置项，为 true 则只输出参数，否则只输出返回值 */
  call_new_param_return_log?: boolean;

  /** 是否输出函数的参数 */
  call_param_log?: boolean;
  /** 参数的输出 */
  call_param_logger?: DataDisplayer;
  /** 是否输出函数的返回值 */
  call_return_log?: boolean;
  /** 返回值的输出 */
  call_return_logger?: DataDisplayer;

  /** 是否输出构造函数的参数 */
  new_param_log?: boolean;
  /** 构造函数参数的输出 */
  new_param_logger?: DataDisplayer;
  /** 是否输出构造函数的返回值 */
  new_return_log?: boolean;
  /** 构造函数返回值的输出 */
  new_return_logger?: DataDisplayer;

  /** 为了去除动态函数中的 debugger 语句而设置的哟。仅供插件内部使用 */
  debugger_statement_handler?: ParamReturnHandler;
  /** 函数调用时处理参数 */
  call_param_handler?: ParamReturnHandler;
  /** 函数调用时处理返回值 */
  call_return_handler?: ParamReturnHandler;
  /** 构造函数调用时处理参数 */
  new_param_handler?: ParamReturnHandler;
  /** 构造函数调用时处理返回值 */
  new_return_handler?: ParamReturnHandler;

  /** 重写函数的调用逻辑 */
  call_handler?: CallNewHandler;
  /** 重写构造函数的调用逻辑 */
  new_handler?: CallNewHandler;
  /** 函数的描述信息 */
  description?: HookerDescription;
}

/** 根据调用 Hooker 时的 this（对象）修改其 descriptor 信息。
 *
 * 为什么添加这个类型可以见 MethodHooker 中 _descriptor 成员的注释
 */
type HookerDescription = (this_arg: any, raw_des: string) => string;

/**
 * 用于 hook 的函数。
 * @param target 表示原本的、要调用的 Function
 * @param ...args 表示传入原来 target 的的参数
 * @this any 依然是原本调用 target 时的 this 哟
 *
 * 下面介绍具体原理：
 *
 * ```js
 * _func = Function;
 * // 现在要 hook Function 的逻辑，以下是传统做法
 * Function = (x) => {
 *      // 去除 debugger
 *      if (x.includes("debugger")) {
 *          return function () {}
 *      }
 *      return _func(x);  // 调用原本的 Function
 * }
 * ```
 *
 * 为了让 Hooker 能够实现这种重写，所以才有了本类型。
 * 注意！它并没有替换 Function 本身，而是本来调用 Function 的，现在改为调用我们写的函数。
 *
 * 现在就可以将上述代码改为：
 *
 * ```js
 * let s = new MethodHooker(globalThis, "Function").hook_it();
 * s.set_caller(
 *      // 传入一个函数，它将会被调用，相当于重写了 Function 逻辑。
 *      // 但底层并没有修改，也就是说，如果传入 null，则可以取消这种重写。
 *      // 该函数的第一个参数为 target，表示原本的 Function
 *      function (target, x) {
 *          if (x.includes("debugger")) {
 *              return function () {}
 *          }
 *          return target(x);  // 调用原本的 Function
 *      }
 * );
 * ```
 */
type CallNewHandler<T extends NormalFunction = NormalFunction> = (
  hooked_target: T,
  ...args: Parameters<T>
) => any;
