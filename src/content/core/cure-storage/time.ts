/** 封装一个简单的 Map，存储时间戳和生成它的位置 */

import cure_share from "../cure-share";
import cure_console from "../cure-console";
import { cure_setting } from "../cure-settings";
import { BaseStorage } from "./base";

/**
 * 本类用于记录时间戳生成的堆栈位置。
 *
 * 此前，是一个时间戳对应一个堆栈，但是时间戳可能会频繁调用，并且堆栈可能有大量重复。
 * 所以改变存储方式，具体如下：
 * - 当生成时间戳 x 时，记录它的堆栈到 Map 中（简称为 stackmap），并且其 value 就是该时间戳 x 本身。
 * 此时在 `storage`，该时间戳 x 的值为它自身。
 * 即现在有两个 Map，一个存储堆栈，一个存储时间戳对应的堆栈序号。
 * - 当又生成一个时间戳时，如果它的堆栈已经存在（比如上面 x 的堆栈），则它的值就是上面 x 的值。
 *
 * 如上所述，现在用一个 Map 记录堆栈最初生成的时间戳，另一个 Map 记录时间戳对应在哪个【生成时间戳】。
 * 这样可以减少内存消耗，可以增加存储的容量为 3000。
 * 当要输出某个时间戳的堆栈时，根据它的值（也是时间戳），去 stackmap 中找到堆栈。
 */
export class TimeStorage extends BaseStorage<string | number, string> {
  /** 存储堆栈以及生成该堆栈的时间戳 */
  #stackmap = new cure_share.CureMap<string, string>();
  protected override logo = "Time Storage";

  constructor() {
    super(3000);
  }

  public override set(key: string, stack: string) {
    if (!stack) {
      return;
    }
    if (this.storage.size > this.capacity) {
      this.clear();
    }
    // 看看该堆栈是否已经存在
    const root = this.#stackmap.get(stack);
    if (root) {
      this.storage.set(key, root);
    } else {
      this.#stackmap.set(stack, key);
      this.storage.set(key, key); // 存储存储的是它自己哟
    }

    this.size = this.storage.size;
  }

  /** 找到 timestamp 对应的索引 */
  #find_index(timestamp: string): string {
    // raw 是已记录的时间戳，time 是该时间戳在 stackmap 中的soyb
    for (const [raw, index] of this.storage.entries()) {
      if ((raw as string).includes(timestamp)) {
        return index;
      }
    }
    return "";
  }

  /** 找到时间戳对应的堆栈。
   * @param timestamp 查找的时间戳
   * @param equal 是否完全匹配，默认为 false，即包含匹配
   * @returns 如果是精准匹配，则只返回一个；否则返回一个数组
   */
  #find_stack(timestamp: string, equal: boolean) {
    let res: string | string[] = equal ? "" : [];
    // 先要找到其对应的索引哟
    timestamp = this.#find_index(timestamp);
    if (!timestamp) {
      return res;
    }

    for (const [stack, time] of this.#stackmap.entries()) {
      if (equal) {
        if (timestamp === time) {
          res = stack;
          break;
        }
      } else {
        if (cure_share.StringFunc.includes(time, timestamp)) {
          cure_share.ArrayFunc.push(res as string[], stack);
          break;
        }
      }
    }
    return res;
  }

  /** 找到时间戳出现的堆栈信息 */
  public override get(timestamp: string | number) {
    if (typeof timestamp === "number") {
      timestamp = cure_share.ElseFunc.to_normal_string(timestamp) as string;
    }
    if (!timestamp) {
      return;
    }

    // 指定时间戳的长度，这样可以快速查找，而不用一一遍历
    // 如果启用了 long_time，则添加的时间戳长度为 16 哟
    const time_length = cure_setting.long_time ? 16 : 13;
    if (timestamp.length === time_length) {
      // 此时找到的是另一个时间戳
      const root = this.storage.get(timestamp);
      const stack = this.#find_stack(root!, true) as string;
      if (stack) {
        cure_console.logger.log_with_logo({
          logo: this.logo,
          data: [`Found timestamp:\n${stack}`],
        });
      } else {
        cure_console.logger.log_with_logo({
          logo: this.logo,
          data: ["Not found timestamp."],
        });
      }
      return;
    }

    const location = this.#find_stack(timestamp, false) as string[];

    if (location.length > 0) {
      const stack = cure_share.ArrayFunc.join([...location]);
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: [`Found timestamp:\n${stack}`],
      });
    } else {
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: ["Not found timestamp."],
      });
    }
  }

  public override clear() {
    super.clear();
    this.#stackmap.clear();
  }

  show() {
    let i = 0;
    for (const [stack, time] of this.#stackmap.entries()) {
      ++i;
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: [`Timestamp: ${time}\n${stack}`],
      });
    }
    // 然后输出索引的时间戳
    for (const [time, index] of this.storage.entries()) {
      if (time === index) {
        continue;
      } // 自引用索引
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: [`Timestamp`, time, "index to", index],
      });
    }
    cure_console.logger.log_with_logo({ logo: this.logo, data: [`Total:`, i] });
  }
}
