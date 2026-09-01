/** 封装 WeakSet 逻辑，与网站隔离 */

import { save_raw_method } from "./helper";

// 保存要用到的 API
const raw_WeakSet = WeakSet;
const raw_add = save_raw_method(raw_WeakSet.prototype.add);
const raw_has = save_raw_method(raw_WeakSet.prototype.has);
const raw_delete = save_raw_method(raw_WeakSet.prototype.delete);

export class CureWeakSet<K extends object> {
  #set = new raw_WeakSet<K>();

  constructor(data?: Iterable<K>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.#set = new raw_WeakSet(data);
  }

  add(key: K) {
    return raw_add(this.#set, key);
  }

  has(key: K) {
    return raw_has(this.#set, key);
  }

  delete(key: K) {
    return raw_delete(this.#set, key);
  }

  get [Symbol.toStringTag]() {
    return "CureWeakSet";
  }
}
