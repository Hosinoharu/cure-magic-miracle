/** 封装 Set 逻辑，与网站隔离 */

import { save_raw_method } from "./helper";

// 保存要用到的 API
const raw_Set = Set;
const raw_add = save_raw_method(raw_Set.prototype.add);
const raw_has = save_raw_method(raw_Set.prototype.has);
const raw_delete = save_raw_method(raw_Set.prototype.delete);
const raw_clear = save_raw_method(raw_Set.prototype.clear);
const raw_keys = save_raw_method(raw_Set.prototype.keys);
const raw_values = save_raw_method(raw_Set.prototype.values);
const raw_entries = save_raw_method(raw_Set.prototype.entries);
const raw_forEach = save_raw_method(raw_Set.prototype.forEach);

export class CureSet<K> {
  #set = new raw_Set<K>();

  constructor(data?: Iterable<K>) {
    this.#set = new raw_Set(data);
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

  clear() {
    return raw_clear(this.#set);
  }

  keys() {
    return raw_keys(this.#set);
  }

  values() {
    return raw_values(this.#set);
  }

  entries() {
    return raw_entries(this.#set);
  }

  forEach(
    callback: (value: K, key: K, set: Set<K>) => void,
    this_arg?: unknown,
  ) {
    return raw_forEach(this.#set, callback, this_arg);
  }

  [Symbol.iterator]() {
    return this.#set[Symbol.iterator]();
  }

  get size() {
    return this.#set.size;
  }

  get [Symbol.toStringTag]() {
    return "CureSet";
  }
}
