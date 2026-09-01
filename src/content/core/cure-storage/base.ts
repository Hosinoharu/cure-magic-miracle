/** 各种 storage 的 base class */

import cure_share from "../cure-share";

/** 封装一个存储 Storage 的 Map 咯 */
export abstract class BaseStorage<
  K extends string | number | symbol,
  V,
> implements ICureStorage {
  protected storage = new cure_share.CureMap<K, V>();

  /** 最多保存的数目条数 */
  protected capacity: number;
  protected size = 0;
  /** 输出相关信息时的 logo */
  protected logo = "Base Storage";

  constructor(capacity = 1000) {
    this.capacity = capacity;
  }

  public set(key: K, value: V) {
    if (!value) {
      return;
    }
    if (this.storage.size > this.capacity) {
      this.clear();
    }
    this.storage.set(key, value);
    this.size = this.storage.size;
  }

  /** 子类根据不同情况来重写读取数据的 API */
  public abstract get(key: K): V | void | undefined;

  public clear() {
    this.storage.clear();
    this.size = 0;
  }
}
