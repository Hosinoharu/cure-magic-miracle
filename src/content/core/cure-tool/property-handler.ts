/** 处理对象 hook 的属性的 api。主要判断对象 obj 上的 x 属性是否被 hook 过了，
 * 避免插件的重复 hook。
 */

import cure_share from "../cure-share";
import * as proxy_handler from "./proxy-handler";

/** 记录当前作用域中，对象 obj 上被 hook 过的属性
 *
 * 比如要 hook `globalThis.eval`，那就添加 globalThis 对象到 obj_hooked_property
 * 然后把属性名 `eval` 添加到 Set 集合中
 */
const obj_hooked_property = new cure_share.CureWeakMap<
  object,
  Set<PropertyKey>
>();

// **下面 api 的参数中，obj 可能是 Proxy 对象，所以需要获取底层对象哟**

/** 判断对象 obj 的 property 属性是否已经被 hook 了 */
export function is_hooked_property(obj: object, property: PropertyKey) {
  obj = proxy_handler.get_raw_obj_from_proxy(obj);
  // 获取 hooked 的属性集合，然后判断属性是否在该集合中
  const keys = obj_hooked_property.get(obj);
  return keys ? keys.has(property) : false;
}

/** 标记对象 obj 的 property 属性已经被 hook 了 */
export function set_hooked_property(obj: object, property: PropertyKey) {
  obj = proxy_handler.get_raw_obj_from_proxy(obj);
  // 不存在需要创建哟
  let keys = obj_hooked_property.get(obj);
  if (keys === undefined) {
    keys = new cure_share.CureSet<PropertyKey>() as unknown as Set<PropertyKey>;
  }
  keys.add(property);
  obj_hooked_property.set(obj, keys);
}

/** 标记对象 obj 的 property 属性已经被取消 hook 了 */
export function delete_hooked_property(obj: object, property: PropertyKey) {
  obj = proxy_handler.get_raw_obj_from_proxy(obj);
  obj_hooked_property.get(obj)?.delete(property);
}
