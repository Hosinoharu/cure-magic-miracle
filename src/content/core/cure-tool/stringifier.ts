/** 转为字符串相关的 api */

import cure_share from "../cure-share";

const raw_json_stringify = JSON.stringify;

/** 使用 JSON.stringify 转换时可能碰到循环引用，所以用这个来创建一个 replacer 哟。
 * @param ignore_func 是否忽略函数，默认为 true，即忽略函数，仅输出函数名称，不转为函数字符串。
 */
function create_json_replacer(ignore_func = true) {
  const seen = new cure_share.CureWeakSet<object>();

  return function replacer(_key: string, value: unknown) {
    // 只有是对象才有可能存在循环引用
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[CureMiracle Tip] circle ref";
      }
      seen.add(value);
    }
    // 输出函数的字符串
    if (!ignore_func && typeof value === "function") {
      // 转为函数字符串咯
      // 如果使用 .toString(v) 可能得到 native code，
      // 但实际上又不是，所以最终决定调用 valueOf 咯，然后调用原生 toString 即可
      return cure_share.ElseFunc.get_func_string(
        cure_share.ElseFunc.get_func_value(value),
      );
    }
    return value;
  };
}

/** 在输出内容时，调用该函数检查是否应该忽略 */
function ignore_value(v: unknown) {
  // 如果 data 是“零值”，干脆别输出了
  if (!v) {
    return true;
  }
  if (typeof v === "string") {
    if (
      v === "" ||
      v === "undefined" ||
      v === "null" ||
      v === "{}" ||
      v === "[]"
    ) {
      return true;
    }
  }
  // 一些特殊的零值
  if (Array.isArray(v) && v.length === 0) {
    return true;
  }

  return false;
}

/** 将数据 data 转为 json 字符串。传入 `replacer` 函数来自定义转换逻辑。
 * @param replacer 用于自定义转换逻辑，默认为 `create_json_replacer()`，即忽略函数。
 * @param space 用于 json 字符串的缩进。
 * @returns 如果返回空字符串，应该忽略它哟
 */
function to_json(
  replacer: (key: string, value: unknown) => unknown,
  space: number,
  ...data: unknown[]
) {
  // 没参数
  if (data.length === 0) {
    return "";
  }
  // 如果只有一个参数，那就直接输出它自身，而不是数组的形式
  if (data.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data = data[0] as any;
    // 忽略部分情况
    if (ignore_value(data)) {
      return "";
    }
  }

  // 此时的 data 可能是一个值，如 `x`，也可能是一个数组 `[x、y]` 哟

  let result = "[CureMiracle Tip] can't to json string";
  if (typeof data !== "function" && typeof data !== "object") {
    result = cure_share.ElseFunc.to_normal_string(data);
  } else {
    try {
      result = raw_json_stringify(data, replacer, space);
      result = cure_share.StringFunc.trim(result);
    } catch (e) {
      result = `[CureMiracle Tip] to_json_string error: ${e}`;
    }
  }

  // 可能包含大量内容，有几百 KB，两种选择：异步 或 截断内容
  // 用异步可能打乱最后输出的内容结构
  // 还是需要截断，太长了影响网站加载速度
  if (result !== undefined && result.length > 5000) {
    return (
      cure_share.StringFunc.substring(result, 0, 5000) +
      `. . . \n[CureMiracle Tip] too long! length: ${result.length}`
    );
  } else if (ignore_value(result)) {
    return "";
  }
  return result;
}

/** 其实就是 `JSON.stringify` 啦。
 * - 如果只传入一个参数 `x`，则相当于 `JSON.stringify(x)` 调用。
 * - 如果传入多个参数 `x、y，则相当于 `JSON.stringify([x, y])` 调用，即包裹成了数组再处理哟。
 */
export function to_string(...data: unknown[]) {
  const replacer = create_json_replacer();
  return to_json(replacer, 0, ...data);
}

/** 转为阅读性更好地、结构层次分明的 JSON 字符串，便于控制台输出。
 *
 * 用法：
 * ```js
 * .to_json_string(obj);
 * .to_json_string(obj1, obj2);
 * ```
 *
 */
export function to_json_string(...data: unknown[]): string {
  const replacer = create_json_replacer(false);
  return to_json(replacer, 2, ...data);
}

/** 提供给 devtools 脚本调用的函数，用于将 obj 对象转为 json 字符串哟 */
export function devtools_tojson(obj: object) {
  const replacer = create_json_replacer(true);
  let result = "[can't to json string]";
  try {
    result = raw_json_stringify(obj, replacer, 0);
    result = cure_share.StringFunc.trim(result);
    if (result.length > 100) {
      result = cure_share.StringFunc.substring(result, 0, 100) + ". . .";
    }
  } catch (e) {
    result = `[to json error: ${(e as Error).message}]`;
  }
  return result;
}
