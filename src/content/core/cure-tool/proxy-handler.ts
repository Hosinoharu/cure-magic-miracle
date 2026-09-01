/** 创建与维护 Proxy 的 api */

import cure_share from "../cure-share/index";
import { proxy_raw_obj_symbol } from "./constant";

const raw_Proxy = Proxy;

/** 创建 Proxy。并它对应的保存原始对象。
 *
 * **如果不需要复杂的 hook 控制，可以直接用这个创建 proxy 哟**。
 */
export function create_proxy(target: object, handler: ProxyHandler<object>) {
  target = get_raw_obj_from_proxy(target);
  return new raw_Proxy(target, handler);
}

/** 判断 obj 是不是插件创建的 Proxy 哟 */
export function is_cure_proxy(obj: unknown) {
  if (obj === undefined || obj === null) return false;
  if (typeof obj !== "object" && typeof obj !== "function") return false;
  // 注意这个操作会调用对象上的 getOwnPropertyDescriptor 方法
  return cure_share.ObjectFunc.hasOwn(obj, proxy_raw_obj_symbol);
}

/** 从 Proxy 对象上获取它代理的底层对象。如果 obj 不是 Proxy 对象，则返回自身。
 * 也就是说：这个方法总会返回原始的对象。
 */
export function get_raw_obj_from_proxy(obj: object) {
  return is_cure_proxy(obj)
    ? cure_share.ReflectFunc.get(obj, proxy_raw_obj_symbol)
    : obj;
}

/** 判断 obj 是否为网站创建的 Proxy！！！
 * 这里不是：hook Proxy，创建 WeakMap 来保存所有网站创建的 Proxy。
 *
 * **主要是针对函数 —— 因为插件主要 Hook 的也是普通的函数**。
 *
 * 利用默认情况下 `Proxy` 的 `.toString()` 结果！但是相关判断需要先判断是否为插件创建的 Proxy，
 * 否则可能误伤哟。
 */
export function is_unknown_proxy(obj: unknown) {
  if (obj === undefined || obj === null) return false;
  if (typeof obj !== "object" && typeof obj !== "function") return false;
  if (typeof obj === "function") {
    const str = cure_share.ElseFunc.get_func_string(obj);
    return str === "function () { [native code]";
  }
  return false;
}

// #cure-todo 需要改进
/** 查找 obj 对象的原型链，看看其原型链上是否存在【由插件创建的 Proxy】存在！
 *
 * **本 API 用于解决 Function.prototype.toString 的堆栈报错问题**，所以可以肯定
 * 传入的 `obj` 是一个函数 —— 如果是一个对象则会调用 Object.prototype.toString，不会触发报错。
 *
 * - 如果存在，则返回 true
 * - 否则，返回 false
 */
export function has_proxy_in_proto_link(obj: unknown) {
  if (obj === undefined || obj === null) return false;
  if (typeof obj !== "object" && typeof obj !== "function") return false;
  // 还有一种情况
  // obj 是一个普通函数，没有被我 hook，
  // 但是我已经 hook Function.prototype.constructor 了，所以应该返回 true。
  // 但是问题分为两个：怎么判断是 Proxy，怎么判断不是插件创建的 Proxy
  let proto = obj;
  while (proto) {
    if (is_cure_proxy(proto)) {
      return true;
    }
    if (is_unknown_proxy(proto)) {
      return false;
    }
    proto = cure_share.ObjectFunc.getPrototypeOf(proto);
  }
  return true;
}
