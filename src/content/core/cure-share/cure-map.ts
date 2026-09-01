/** 封装 Map 逻辑，与网站隔离 */

import { save_raw_method } from "./helper";

// 保存要用到的 API
const raw_Map = Map;
const raw_set = save_raw_method(raw_Map.prototype.set);
const raw_get = save_raw_method(raw_Map.prototype.get);
const raw_has = save_raw_method(raw_Map.prototype.has);
const raw_delete = save_raw_method(raw_Map.prototype.delete);
const raw_clear = save_raw_method(raw_Map.prototype.clear);
const raw_keys = save_raw_method(raw_Map.prototype.keys);
const raw_values = save_raw_method(raw_Map.prototype.values);
const raw_entries = save_raw_method(raw_Map.prototype.entries);
const raw_forEach = save_raw_method(raw_Map.prototype.forEach);

/** 保存的 Map API */
export class CureMap<K extends string | number | symbol, V> {
  #map: Map<K, V>;

  constructor(data?: Iterable<readonly [K, V]>) {
    this.#map = new raw_Map(data);
  }

  set(key: K, value: V) {
    return raw_set(this.#map, key, value);
  }

  get(key: K): V | undefined {
    return raw_get(this.#map, key);
  }

  has(key: K) {
    return raw_has(this.#map, key);
  }

  delete(key: K) {
    return raw_delete(this.#map, key);
  }

  clear() {
    return raw_clear(this.#map);
  }

  keys() {
    return raw_keys(this.#map);
  }

  values() {
    return raw_values(this.#map);
  }

  entries() {
    return raw_entries(this.#map);
  }

  forEach(
    callback: (value: V, key: K, map: Map<K, V>) => void,
    this_arg?: unknown,
  ) {
    return raw_forEach(this.#map, callback, this_arg);
  }

  [Symbol.iterator]() {
    return this.#map[Symbol.iterator]();
  }

  get size() {
    return this.#map.size;
  }

  get [Symbol.toStringTag]() {
    return "CureMap";
  }
}
