/** 封装 WeakMap 逻辑，与网站隔离 */

import { save_raw_method } from "./helper";

// 保存要用到的 API
const raw_WeakMap = WeakMap;
const raw_set = save_raw_method(raw_WeakMap.prototype.set);
const raw_get = save_raw_method(raw_WeakMap.prototype.get);
const raw_has = save_raw_method(raw_WeakMap.prototype.has);
const raw_delete = save_raw_method(raw_WeakMap.prototype.delete);

export class CureWeakMap<K extends object, V> {
  #weakmap: WeakMap<K, V>;

  constructor(data?: Iterable<readonly [K, V]>) {
    this.#weakmap = new raw_WeakMap(data);
  }

  set(key: K, value: V) {
    return raw_set(this.#weakmap, key, value);
  }

  get(key: K): V | undefined {
    return raw_get(this.#weakmap, key);
  }

  delete(key: K) {
    return raw_delete(this.#weakmap, key);
  }

  has(key: K) {
    return raw_has(this.#weakmap, key);
  }

  get [Symbol.toStringTag]() {
    return "CureWeakMap";
  }
}
