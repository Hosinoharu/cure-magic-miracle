import cure_tool from "../cure-tool";
import cure_share from "../cure-share";

/** 定义条件断点。
 *
 * 如可开启了断点，但没有设置条件断点，也会断住。
 *
 * - 比如在取值的时候，在返回值满足某个要求时断点等等。
 * - 比如在函数调用的时候进行断点等等
 */
export class CureDebugger {
  /** 是否启用断点、以及断点条件 */
  constructor(
    public on: boolean,
    private _condition?: ConditionalDebugger | null,
  ) {}

  public get condition() {
    return this._condition;
  }

  /** 如果传入字符串，那就是字符串断点啦 */
  public set condition(
    v: ConditionalDebugger | string | RegExp | undefined | null,
  ) {
    // 如果想忽略大小写比较，应该传入正则表达式！！！
    if (typeof v === "string" || v instanceof RegExp) {
      this._condition = (...args: unknown[]) => {
        // 使用 JSON.stringify 处理，转为字符串
        const s = cure_tool.stringifier.to_string(args);
        // 值为 -1 表示没找到，根本没有这个字符串哟
        return cure_share.StringFunc.search(s, v) !== -1;
      };
    } else {
      this._condition = v;
    }
  }

  /** 传入要断点的内容，进行断点。*/
  public debug(...data: unknown[]) {
    if (!this.on) return;

    if (!this._condition) {
      cure_tool.normal.curedebug();
      debugger;
    } else if (this._condition(...data)) {
      cure_tool.normal.curedebug();
      debugger;
    }
  }
}
