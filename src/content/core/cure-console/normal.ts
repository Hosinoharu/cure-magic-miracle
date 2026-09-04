/** 其它的 api */

import * as logger from "./logger";
import cure_tool from "../cure-tool";
import cure_share from "../cure-share";
import { expose_name } from "@/shared";

/** 如访问属性 `obj.property` 时，它可能需要查找原型链，
 * 本方法就是输出它寻找的过程，以及最终的 descriptor 描述符
 */
export function show_property_descriptor(obj: object, property: PropertyKey) {
  let current_obj = obj;
  let count = 0;
  while (current_obj) {
    const name = cure_tool.normal.get_obj_name(current_obj) || current_obj;
    logger.log_with_logo({
      logo: "Track - Search on:",
      data: [name],
    });

    const descriptor = cure_share.ObjectFunc.getOwnPropertyDescriptor(
      current_obj,
      property,
    );
    if (descriptor) {
      logger.log_with_logo({
        logo: `Find Descriptor (${count}xproto)`,
        data: [descriptor],
      });
      // 可能原型链上有多个重名属性，为了更加具体的展示，所以继续查找，直到 null
    }
    current_obj = cure_share.ObjectFunc.getPrototypeOf(current_obj);
    ++count;
  }
}

// #region 清除定时器等

const set_interval = setInterval;
const set_timeout = setTimeout;
const raw_clearInterval = clearInterval;
const raw_clearTimeout = clearTimeout;

/** 提取出来的逻辑。用于清空 [start, end] 范围的 setInterval、setTimeout。
 * - 如果没有传入 `start、end`，则清空 [1, current_id] 范围内的。
 * 会先计算出当前的 `interval_id、timeout_id`，然后清空它们。
 * - 如果只传入 `start`，则只清空指定的哟
 */
function clear_timer(
  type: "interval" | "timeout",
  start?: number,
  end?: number,
) {
  const func = type === "interval" ? set_interval : set_timeout;
  const clear = type === "interval" ? raw_clearInterval : raw_clearTimeout;
  // 可能运行该函数的时候，依然在创建 interval、timeout，所以多处理一些
  const over = 200;
  if (start === undefined) {
    start = 1;
    if (end === undefined) {
      // 获取当前的 id 到了哪了
      // @ts-ignore
      end = (over + func(() => {}, 100000)) as number;
    }
  }
  if (end === undefined) {
    end = start;
  }
  for (let i = start; i <= end; ++i) {
    clear(i);
  }
  logger.log_with_logo({ data: [`clear ${type} [${start}, ${end}]`] });
}

// MARK: export

/** 清除 `[start, end]` 范围内的所有定时器。默认是清空所有 */
export function clear_interval(start?: number, end?: number) {
  clear_timer("interval", start, end);
}

/** 清除 `[start, end]` 范围内的所有计时器。默认是清空所有 */
export function clear_timeout(start?: number, end?: number) {
  clear_timer("timeout", start, end);
}

// #endregion

// #region window 新增属性

/** 获取默认的 globalThis 下的属性名，还把插件注入的属性也放入哟 */
const raw_windows_properties = new cure_share.CureSet<string>(
  cure_share.ObjectFunc.getOwnPropertyNames(globalThis),
).add(expose_name);

type GlobalThisNames = (keyof typeof globalThis)[];

/** 找出 globalThis 中新增了哪些有用的属性 */
function get_window_added_properties() {
  const added_properties: GlobalThisNames = [];
  const names = cure_share.ObjectFunc.getOwnPropertyNames(
    globalThis,
  ) as GlobalThisNames;

  for (const n of names) {
    if (raw_windows_properties.has(n)) continue;
    // globalThis[0]、window[1]... 这些是访问 iframe 中的 window，此处忽略
    if (!isNaN(parseInt(n))) continue;

    const target = globalThis[n];

    if (target === null || target === undefined) continue;
    // 如果该属性是函数，那么需要过滤掉浏览器自带的函数啦，通过 toString() 来判断
    if (typeof target === "function") {
      const func_str: string = cure_share.ElseFunc.get_func_string(target);
      // 是本地函数
      const is_native = cure_share.StringFunc.endsWith(
        func_str,
        "{ [native code] }",
      );
      // 是命令行专用的函数
      const is_command = cure_share.StringFunc.endsWith(
        func_str,
        "{ [Command Line API] }",
      );

      if (is_native || is_command) continue;
    }
    // 此处目的是忽略 DOM 对象等
    if (target instanceof EventTarget) continue;

    cure_share.ArrayFunc.push(added_properties, n);
  }

  return added_properties;
}

/** 输出 globalThis 下新增加了哪些东西 */
export function show_window_added_property() {
  let count = 0;
  for (const n of get_window_added_properties()) {
    logger.log_with_logo({ data: [`[+] ${n} ==> ${globalThis[n]}`] });
    ++count;
  }
  count !== 0 &&
    logger.log_with_logo({ data: [`globalThis added property count:`, count] });
}

// #endregion
