/** 处理堆栈的 api */

import { cure_setting } from "../cure-settings";
import cure_console from "../cure-console";
import cure_share from "../cure-share";
import { maximum_call_stack_size } from "./constant";
import * as proxy_handler from "./proxy-handler";

const raw_Error = Error;

// @ts-ignore
const raw_stackTraceLimit = Error.stackTraceLimit;

// #region 解析堆栈

/** 插件内部的函数都以该字符串开头！ */
const self_stack_pattern = "curemiracle_";
/** 堆栈可能是 hook 文件的路径！如 at chrome-extension://xx/content/cure_miracle_core.js */
const self_file_name = "cure_miracle_core";

type ParsedStack = {
  /** 堆栈的报错信息 */
  message: string;
  /** 原本顶层的堆栈。如果原本的顶层堆栈是插件自身的堆栈，则会被删除，此时 top 为 undefined */
  top?: string;
  /** 除去顶层堆栈之后的堆栈信息，保留原本堆栈的空格、缩进等等 */
  stack: string[];
  /** 该堆栈是否包含插件自身 */
  self: boolean;
};

/** 解析堆栈，同时会删除插件自身的堆栈。
 *
 * @returns 否则返回解析后的堆栈信息。
 */
function parse_stack_without_self(
  stack: string | undefined,
): ParsedStack | undefined {
  if (!stack) {
    return undefined;
  }

  const stack_arr = cure_share.StringFunc.split(stack, "\n");
  const parse_result: ParsedStack = {
    // 堆栈第一个内容就是报错信息咯
    message: stack_arr[0],
    stack: [],
    self:
      cure_share.StringFunc.includes(stack, self_stack_pattern) ||
      cure_share.StringFunc.includes(stack, self_file_name),
  };

  // 没有插件内部的堆栈
  if (!parse_result.self) {
    parse_result.top = stack_arr[1];
    parse_result.stack = stack_arr.slice(2);
    return parse_result;
  }

  // 从下往上找到第一个插件内部堆栈的位置，那么它的下一个位置就是触发 Hooker 的位置。
  // 不过，顶层堆栈不一定就是插件内部的堆栈，所以这里需要判断一下
  const top = stack_arr[1];
  if (!is_cure_call_stack(top)) {
    parse_result.top = top;
  }

  const entrypoint_index = cure_share.ArrayFunc.findLastIndex(
    stack_arr,
    is_cure_call_stack,
  ) as number;
  // 然后将剩下的内容转移到新的数组中就行啦
  // 注意移动内容时的起使索引。
  // - 如果当前堆栈没有找到插件内部的方法，需要从索引 2 开始,因为 0、1 层上面已经处理了
  // - 否则，就要从 end_index + 1 开始，那就是进入插件时的堆栈哟
  const start_index = entrypoint_index === -1 ? 2 : entrypoint_index + 1;
  for (let i = start_index; i < stack_arr.length; i++) {
    const line = stack_arr[i];
    if (!is_cure_call_stack(line)) {
      cure_share.ArrayFunc.push(parse_result.stack, line);
    }
  }

  return parse_result;
}

/** 将解析后的堆栈还原成字符串 */
function parsed_stack_to_string(parsed: ParsedStack) {
  let res = parsed.message + "\n";
  if (parsed.top) {
    res += parsed.top + "\n";
  }
  res += cure_share.ArrayFunc.join(parsed.stack, "\n");
  return res;
}

// #endregion

// #region 输出未被捕获的报错信息

// @ts-ignore
function curemiracle_prepare_stack(e: Error, _call_site: NodeJS.CallSite[]) {
  const parsed = parse_stack_without_self(e.stack);
  if (!parsed) {
    return;
  }

  const message = parsed.message
    ? `\n\tmessage: ${cure_share.StringFunc.trim(parsed.message)}`
    : "";
  const top = parsed.top
    ? `\n\ttop stack: ${cure_share.StringFunc.trim(parsed.top)}`
    : "";
  const title =
    "[CureMiracle Catch Stack" + (parsed.self ? " In Self" : "") + "]";

  // 这通常是利用 `new Error()` 创建的 Error，通常无用，暂时忽略吧
  if (cure_setting.catch_stack && parsed.message !== "Error") {
    cure_console.logger.log_with_logo({
      logo: title,
      style: "cure_zukyoon",
      data: [message, top],
    });
  }

  return parsed_stack_to_string(parsed);
}

cure_share.ObjectFunc.defineProperty(Error, "prepareStackTrace", {
  value: curemiracle_prepare_stack,
  configurable: false,
  writable: false,
  enumerable: false,
});

// #endregion

/** 实际上设置堆栈为 deep+10，因为需要兼顾插件内部的堆栈位置占用啦 */
function set_stack_trace_limit(deep = maximum_call_stack_size) {
  if (raw_stackTraceLimit !== undefined) {
    // 这里增加 10 是为了容纳堆栈中存在插件本身的调用
    // 也就是说，本来想获取 100 层堆栈，因为去除插件自身的调用
    // 最终获取到的堆栈可能只有 95 层，影响后面的判断，所以这里增加 10

    // @ts-ignore
    Error.stackTraceLimit = deep + 10;
  }
}

function reset_stack_trace_limit() {
  if (raw_stackTraceLimit !== undefined) {
    // @ts-ignore
    Error.stackTraceLimit = raw_stackTraceLimit;
  }
}

/** 判断某一条堆栈信息是否为插件内部调用。
 *
 * 此前使用 `s.includes('curemiracle_')` 来判断，但有失偏颇，比如存在：
 * `at doCheck (eval at curemiracle_apply` 的情况。
 *
 * 所以现在需要更准确的判断咯
 */
function is_cure_call_stack(s: string) {
  if (cure_share.StringFunc.includes(s, self_file_name)) {
    return true;
  }

  const index: number = cure_share.StringFunc.indexOf(s, self_stack_pattern);
  // 不包含该字符串，说明不是插件内部调用
  if (index === -1) {
    return false;
  }
  // 包含的情况下还需要判断 `at doCheck (eval at curemiracle_apply`
  // 这是网站通过 eval 调用了 hook 的函数啦，也要忽略
  const pattern = "(eval at ";
  if (
    cure_share.StringFunc.substring(s, index - pattern.length, index) ===
    pattern
  ) {
    return false;
  }
  return true;
}

/** 获取指定深度的堆栈信息。
 *
 * @param stack_deep 可以指定获取多少内容的堆栈。
 * - 如果输入 `10`，则默认获取 10+10 层堆栈，然后剔除插件内部的堆栈并返回。
 */
function curemiracle_get_call_stack(stack_deep?: number) {
  stack_deep && set_stack_trace_limit(stack_deep);
  const stack = new raw_Error().stack || "";
  stack_deep && reset_stack_trace_limit();
  return stack;
}

// MARK: export

/** 处理堆栈，主要是删除堆栈中关于插件的信息，并返回堆栈数组用于处理
 *
 * @param stack 堆栈字符串
 * @param remove_top 是否移除堆栈最顶层的信息，通常移除，因为最顶层的堆栈可能包含插件调用信息了。
 * @param truncate 是否截断，如果堆栈太长，则返回简短信息
 * @param pretty 是否用于打印，如果是，则会将堆栈左右两边的空格去掉，并加上 => 箭头来标记哟
 * @param [remove_err_msg=false] 移除堆栈中的错误描述信息，仅返回真正的堆栈。该选项只在输出堆栈时才有用
 * @returns 返回堆栈构成的数组。**如果只想去除插件内部堆栈**，则 `remove_top、truncate、for_print` 都设置为 `false`。
 */
function curemiracle_handle_cure_stack(
  stack: string | undefined,
  remove_top: boolean,
  truncate: boolean,
  pretty: boolean,
  remove_err_msg = false,
) {
  const parsed = parse_stack_without_self(stack);
  if (!parsed) {
    return [];
  }

  /** 最终返回的堆栈 */
  const stack_result: string[] = [];
  !remove_err_msg && cure_share.ArrayFunc.push(stack_result, parsed.message);
  !remove_top &&
    parsed.top &&
    cure_share.ArrayFunc.push(stack_result, parsed.top);

  for (let i = 0; i < parsed.stack.length; i++) {
    const line: string = pretty
      ? cure_share.StringFunc.trim(parsed.stack[i])
      : parsed.stack[i];

    // 堆栈太长需要进行阶段
    // 实践发现，有些网站的函数名会写得非常长（故意的），居然有几十 KB 以上！
    if (truncate && line.length > 500) {
      cure_share.ArrayFunc.push(
        stack_result,
        "[CureMiracle Tip] call tack too long",
      );
    } else {
      // 用于输出的情况要加上小箭头
      const s = pretty ? `=> ${line}` : line;
      cure_share.ArrayFunc.push(stack_result, s);
    }
  }

  return stack_result;
}

/** 获取进入插件时的那个堆栈。返回空字符串表示并没有在插件外部调用。
 *
 * 如下面的例子。
 * ```text
 * Error
 *   at MethodHooker.curemiracle_set_prototype_of (cure_core_hook.js:415:15)
 *   at Object.curemiracle_set_prototype_of [as setPrototypeOf] (cure_core_hook.js:501:54)
 *   at Function.setPrototypeOf (<anonymous>)
 *   at test.html:28:9
 * ```
 *
 * 最终将获取到 `at Function.setPrototypeOf (<anonymous>)` 这部分的内容。
 * 因为就是从这里进入插件内部的
 */
export function curemiracle_get_entrypoint() {
  const parsed = parse_stack_without_self(curemiracle_get_call_stack());
  if (!parsed || !parsed.self || parsed.stack.length === 0) {
    return "";
  }
  return cure_share.StringFunc.trim(parsed.stack[0]);
}

/** **本函数用于输出堆栈**，受到 `no_log` 配置项影响。获取触发 Hook 的堆栈，并且已经清除了插件内部的堆栈哟，
 *
 * @param des 描述信息，用于在输出堆栈时进行标记
 * @param [is_print=true] 启用该功能后将直接在控制台中输出堆栈（返回值将忽略），否则就返回堆栈字符串。默认为 true。
 * @param [hook_id=''] 指定 Hooker 的 ID，用于在输出堆栈时进行标记
 */
export function curemiracle_get_caller_location(
  is_print = true,
  hook_id = "",
  des = "",
) {
  // 如果插件禁止输出日志，那么就不需要获取堆栈了（仅限于插件本身不能使用，但要保证控制台中能使用）
  if (!is_print && cure_setting.no_log) {
    return "";
  }

  /** 最终返回的堆栈字符串 */
  let stack_result = "";
  const stacks = curemiracle_handle_cure_stack(
    curemiracle_get_call_stack(10),
    false,
    true,
    true,
    true,
  );
  if (stacks.length !== 0) {
    stack_result = cure_share.ArrayFunc.join(stacks, "\n");
  }

  let title = "Call stack info" + (des ? ` <${des}>` : "");
  if (hook_id !== "") {
    title = `<id=${hook_id}> ${title}`;
  }

  if (is_print && stack_result) {
    cure_console.logger.log_with_group({
      title,
      data: stack_result,
      force_log: true,
    });
    return "";
  }

  // 没有堆栈，强制输出！但必须有描述信息才能输出，不然谁知道哪个输出了
  if (stack_result === "" && des) {
    !cure_setting.no_log && cure_console.logger.log_with_stack(title);
  }
  return stack_result;
}

/** 为了过掉 Proxy 的报错堆栈检测，在 Proxy 中访问时，如果报错就重写堆栈信息哟。也就是说去除掉插件内部的堆栈咯。
 *
 * @param e 错误实例
 * @param des 描述信息，比如描述是哪个 Hooker 的哪个 handler 报错的
 * @param [remove_top=false] 是否删除顶层的堆栈。用于特殊情况，需要清理在插件中调用痕迹。
 */
export function curemiracle_get_faker_stack(
  e: Error,
  _des: string,
  remove_top = false,
) {
  if (!e) return e; // 没有堆栈信息，不处理
  // cure_console.logger.slight_warn("Catch Error", des, "=>", e.message);
  const new_stack = curemiracle_handle_cure_stack(
    e.stack,
    remove_top,
    false,
    false,
  );
  return cure_share.ArrayFunc.join(new_stack, "\n");
}

/** 检测当前调用是否处于一个自循环无限调用中。如果存在将抛出对应的异常 */
export function curemiracle_check_self_call_loop(des: string) {
  const stacks = curemiracle_handle_cure_stack(
    curemiracle_get_call_stack(maximum_call_stack_size),
    false,
    true,
    false,
  );
  // 堆栈层数太少，说明不是自循环调用咯
  if (stacks.length <= maximum_call_stack_size) {
    return;
  }
  // 否则，不检查了，都调用了好几千层堆栈，直接判断为自循环调用
  cure_console.logger.log_with_logo({
    data: [
      `[${des}] maybe in a self calling loop! so clear all Interval、Timeout!`,
    ],
  });
  // 清空定时器！
  cure_console.normal.clear_interval();
  cure_console.normal.clear_timeout();
  // 手动抛出堆栈溢出异常，提前结束
  throw new cure_share.CureError("Maximum call stack size exceeded");
}

/** 处理一个 Proxy 的堆栈，只能在 Function.prototype.toString 中调用！！！
 *
 * 该检测点主要在于【函数 .toString() 的 堆栈报错】，如果是对象，则不会有这个问题。
 *
 * 使用 `s = object.create(xx)` 创建对象时，调用 `s.toString()` 会出发报错，其规律如下：
 *
 * # 情况 1
 * 正常情况两个都是报错，且顶层堆栈是 **at Function.toString (<anonymous>)**
 * - `Object.create(atob)+""`
 * - `Object.create(function(){})+""`
 *
 * 若 atob、或者 Function.prototype.constructor 被 hook（创建 Proxy）时，
 * 上述报错堆栈将变为 at Object.toString (<anonymous>)。
 * 所以需要堆栈伪造
 *
 * # 情况 2
 * 正常情况两个都是报错，且顶层堆栈是 **at Object.toString (<anonymous>)**
 * - `Object.create(new Proxy(atob,{}))+"" `
 * - `Object.create(new Proxy(function(){},{}))+""`
 *
 * 若 atob、或者 Function.prototype.constructor 被 hook（创建 Proxy）时，
 * 堆栈不变，实际上 new Proxy 后得到的确实是一个对象，而不是函数
 *
 * @param e 错误实例
 * @param raw_obj 原始对象
 *
 */
export function curemiracle_handle_proxy_tostring(
  e: Error,
  raw_obj: object,
): string | undefined {
  if (!e.stack) {
    return e.stack;
  }

  // 特定的报错信息才处理嘛
  if (
    !cure_share.StringFunc.includes(
      e.message,
      "Function.prototype.toString requires that 'this' be a Function",
    )
  ) {
    return e.stack;
  }

  if (!proxy_handler.has_proxy_in_proto_link(raw_obj)) {
    return e.stack;
  }

  // 只需要第一次匹配就好了！！
  return cure_share.StringFunc.replace(
    e.stack,
    "at Object.toString",
    "at Function.toString",
  );
}
