/** 通用的 API */

import cure_share from "../cure-share";
import { cure_setting } from "../cure-settings";

/** 生成 hook id，用于标识相互联系的信息。 */
export const get_hookid = (() => {
  /** 自增表示 hook id，避免输出的 hook 信息无关联 */
  let hook_id = 0;
  return () => `${++hook_id}`;
})();

/** 当禁用所有断点的时候，为了能让 Hook 代码断点，所以使用了 XHR 断点！*/
export function curedebug() {
  if (!cure_setting.cure_debug) return;
  const url = `chrome-extension://${cure_setting.extension_id}/third-code/curedebug.txt`;
  new cure_share.CurePromise(cure_share.XHRFunc.fetch(url))
    .then(() => {})
    .catch(() => {});
}

/** 同步请求一个文件并获取其内容！
 * 设计的初衷是为了获取 worker 请求的文件！
 */
export function fetch_sync(url: string) {
  const xhr = new cure_share.CureXHR();
  xhr.open("GET", url, false);
  xhr.send();
  return xhr.responseText;
}

/** 实现 `__lookupGetter__、__lookupSetter__`
 * 获取对象上某个属性对应的 getter、setter 函数。
 *
 * 外部通过 `const [get, set] = xxx()` 形式获取。
 */
export function lookup_getter_setter(obj: object, property: PropertyKey) {
  let current_obj = obj;
  while (current_obj) {
    const descriptor = cure_share.ObjectFunc.getOwnPropertyDescriptor(
      current_obj,
      property,
    );
    if (descriptor) {
      const getter = cure_share.ObjectFunc.hasOwn(descriptor, "get")
        ? descriptor.get
        : undefined;
      const setter = cure_share.ObjectFunc.hasOwn(descriptor, "set")
        ? descriptor.set
        : undefined;

      return [
        getter as () => void,
        setter as (value: unknown) => unknown,
      ] as const;
    }
    current_obj = cure_share.ObjectFunc.getPrototypeOf(current_obj);
  }
  return [undefined, undefined] as const;
}

/** 获取任意对象的类型 */
export function get_type(obj: unknown) {
  // 该方法返回 '[object xxx]'，其中 xxx 部分就是所需要的类型！
  const s: string = cure_share.ObjectFunc.get_type_info(obj);
  const end = cure_share.StringFunc.indexOf(s, "]");
  if (end === -1) {
    throw new cure_share.CureError(`Get object type error：${s}`);
  }
  // 得到上述 xxx 的字符串信息
  return cure_share.StringFunc.substring(s, 8, end);
}

/** 获取对象的名字，没有名字则返回空字符串哟 */
export function get_obj_name(obj: object): string {
  // 先访问特殊的属性 —— 主要用于内置对象
  // 当然，也可以使用 Object.prototype.toString.call(obj) 来获取
  let name = cure_share.ReflectFunc.get(obj, Symbol.toStringTag);
  if (name !== undefined) {
    return name;
  }

  // 一些对象具备该属性，比如说 class A{} 定义的类，但不稳定，毕竟该属性可以自定义
  name = cure_share.ReflectFunc.get(obj, "name");
  if (name !== undefined) {
    return name;
  }

  return "";
}

/** 有些情况下，需要修改 obj 自身属性，但它被 Object.freeze 了，故需要创建副本！
 * 如果没有 freeze，则直接返回 obj 本身。
 */
export function copy_frozen_obj(obj: object) {
  if (cure_share.ObjectFunc.is_frozen(obj)) {
    return { ...obj };
  }
  return obj;
}

/** 是否为顶层 frame */
export function is_top_frame() {
  let r = false;
  try {
    // @ts-ignore
    r = globalThis === globalThis.top;
  } catch {}
  return r;
}

/** 将 URL 的前缀部分 `http、https` 进行替换并返回。
 *
 * 因为在控制台中输出链接时会进行“省略”，并呈现一个可点击链接，
 * 这会造成搜索关键字时失效 */
export function get_visible_url(url: string) {
  return cure_share.StringFunc.replace(url, /^(https?:\/\/)/, "");
}

/** 使用 new Function 形式来动态执行代码！ */
export function eval_code(code: string) {
  return new cure_share.ElseFunc.Function(`return (${code})`)();
}
