import cure_console from "../cure-console";
import cure_tool from "../cure-tool";
import { cure_setting } from "../cure-settings";

/** 定义输出器，主要用于 hook 时输出参数、返回值等等，便于展示。
 *
 * 默认使用 json 格式输出咯
 */
export class CureLogger {
  /** 它记录外部 Hooker 的调用次数（输出次数），当超过最大调用次数时，将禁止输出哟 */
  #count = 0;
  /** 记录是否达到最大输出次数，是则输出警告信息 */
  #max_log_limit = false;

  /** 传入输出模式、自定义的格式输出器。默认转为 json 字符串哟 */
  constructor(
    private _log_type: LoggerType,
    private _des: string,
    private _on: boolean,
    private _displayer?: DataDisplayer | null,
  ) {
    this.displayer = _displayer;
  }

  /** 判断当前是否能进行输出，返回 true 表示可以进行输出哟！ */
  public can_log() {
    return this.on && !this.#is_max_count();
  }

  public reset_count() {
    this.#count = 0;
  }

  /** 是否已经到了最大的输出次数限制 */
  #is_max_count() {
    const r = this.#count >= cure_setting.max_log_count;
    // 现在已经达到最大输出次数了，但上一次没有输出警告，所以输出警告
    if (r && !this.#max_log_limit) {
      cure_console.logger.slight_warn(
        "Stop log",
        `[${this._des}] <${this._log_type} logger> reaches the maximum log count:`,
        cure_setting.max_log_count,
      );
    }
    this.#max_log_limit = r;
    return r;
  }

  /** 是否可以输出 */
  public get on() {
    return this._on && !cure_setting.no_log;
  }
  public set on(v: boolean) {
    this._on = v;
  }

  public get displayer() {
    return this._displayer;
  }

  /** 设置输出值时该怎么处理
   * - 传入 `null` 则不处理，相当于不输出内容
   * - 传入 `undefined` 则使用默认的 json 格式输出
   */
  public set displayer(v: DataDisplayer | undefined | null) {
    /** 默认使用 json 格式输出咯 */
    if (v === undefined) {
      this._displayer = cure_tool.stringifier.to_json_string;
    } else {
      this._displayer = v;
    }
  }

  /** 传入要输出的内容，返回要展示的内容。返回空字符串就不需要输出啦 */
  public display(...data: unknown[]): string {
    if (this._displayer && this.can_log()) {
      ++this.#count;
      return this._displayer(...data) as string;
    }
    return "";
  }
}
