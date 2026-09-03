/** 使用*变量的形式*来读写顶层的配置项
 *
 * 具体说明见 readme 文档
 */

import {
  get_storage,
  get_temp_storage,
  remove_storage,
  set_storage,
  set_temp_storage,
  remove_temp_storage,
} from "./normal";

/** 读写一个顶层配置项，将它封装成一个变量来操作。
 *
 * 传入的泛型 `Structure` 表示这个顶层配置项的结构，这样在访问变量时有一定的类型提示。
 *
 * 泛型 `VType` 表示这个变量的值类型
 */
export class TopKVManager<Structure, VType> {
  #get_storage: (name: keyof Structure) => Promise<unknown>;
  #set_storage: (name: keyof Structure, value: VType) => Promise<void>;
  #del_storage: (name: keyof Structure) => Promise<void>;

  /** 顶层配置项的名称 */
  #name: keyof Structure;

  /**
   * @param persistent 是否使用持久化存储，
   * - 如果为 false，则使用临时存储，浏览器重启后失效
   * - 其实就是使用 `chrome.storage.local` 还是 `chrome.storage.session` 啦
   */
  constructor(name: keyof Structure, persistent: boolean) {
    this.#name = name;
    this.#get_storage = persistent ? get_storage : get_temp_storage;
    this.#set_storage = persistent ? set_storage : set_temp_storage;
    this.#del_storage = persistent ? remove_storage : remove_temp_storage;
  }

  /** 初始化该变量。
   * - 如果该变量已经存在，则忽略初始化
   * - 否则，就用这个值进行初始化。
   * @returns 返回 true 表示进行了初始化，否则就是该值已经存在了 */
  async init(value: VType) {
    const name = this.#name;
    let ok = false;
    const raw = await this.#get_storage(name);

    if (!raw) {
      await this.#set_storage(name, value);
      ok = true;
    }

    return ok;
  }

  /** 设置变量的值 */
  async set(value: VType) {
    await this.#set_storage(this.#name, value);
  }

  /** 获取变量的值 */
  async get(): Promise<VType | undefined> {
    return (await this.#get_storage(this.#name)) as VType;
  }

  /** 删除该变量 */
  async del() {
    await this.#del_storage(this.#name);
  }
}
