/**
 * 普通的变量型配置项只需要简单的读写就好，
 * 但是对于复杂配置项的存储还需要考虑多方监听变化、日志输出、缓存等问题，所以才有了此处操作。
 */

import { TopKVManager } from "./topkv_manager";
import { Logger } from "./logger";

type KVObject = { [key: string]: unknown };

/** 操作一个配置项的基类。
 * - 泛型 Structure 表示顶层配置项的结构
 * - 泛型 VType 表示该配置项的值类型
 */
export class ExTopKVManager<Structure, VType extends KVObject> {
  /** 操作配置项 */
  readonly #manager: TopKVManager<Structure, VType>;
  /** 临时缓存对象 */
  protected temp: VType = {} as VType;
  /** 标记是否初始化完成 */
  #initialized = false;
  protected readonly logger: Logger;
  /**  注意绑定 this 哟 */
  readonly #listener = this.#listen_func.bind(this);
  /** 操作的配置项名称 */
  readonly #name: keyof Structure;
  /** 默认配置项，当配置项清空时有用！ */
  protected readonly default_setting: VType;

  /**
   *
   * @param log_prefix 日志前缀
   * @param name 操作的配置项名称，即 `chrome.storage` 中的顶层键名，比如 `Tab`
   * @param default_setting 默认配置项，当配置项清空时有用！
   * @param persistent 当前配置项是否持久化存储
   */
  constructor(
    log_prefix: string,
    name: keyof Structure,
    default_setting: VType,
    persistent: boolean,
  ) {
    this.logger = new Logger(log_prefix);
    this.#name = name;
    this.default_setting = default_setting;
    this.#manager = new TopKVManager(name, persistent);

    this.init();
  }

  /** 监听 storage 变化的函数 */
  #listen_func(
    changes: { [key: string]: chrome.storage.StorageChange },
    namespace: string,
  ) {
    const t = this;
    if (!t.#initialized) return;

    const target = changes[t.#name as string];
    if (target) {
      t.temp = (target.newValue || t.default_setting) as VType;
      this.logger.log_with_logo("☆", `${namespace}Storage onChanged`, changes);
    }
  }

  /** 监听 chrome.storage 的变化，用于更新缓存 */
  listen() {
    chrome.storage.onChanged.addListener(this.#listener);
    return this;
  }

  /** 停止监听 chrome.storage 的变化，某些情况下访问某个设置项的只有当前位置，自然不需要监听咯 */
  stop_listen() {
    chrome.storage.onChanged.removeListener(this.#listener);
    return this;
  }

  /** 获取当前的配置项 */
  async init() {
    if (this.#initialized) return;
    await this.#manager.init(this.default_setting);
    this.temp = (await this.#manager.get())!;
    this.#initialized = true;
  }

  /** 将当前缓存的配置项存储到 chrome.storage 中 */
  async save() {
    await this.#manager.set(this.temp);
  }
}
