/** 表示输出时的信息，这些操作都有对应的样式，从而便于分析
 *
 * - `Get` 表示取值操作
 * - `Set` 表示设置值操作
 * - `Call` 表示函数调用
 * - `New` 表示构造函数调用
 */
type Operation = "Get" | "Set" | "Call" | "New";

/** 为 `group_log()` 的参数定义类型 */
type GroupLogParams = {
  /** group 的标题 */
  title: string;
  /** 用于标题的样式，可以为空 */
  title_style?: string;
  /** 定义 logo，它位于 title 前面，用 [xxx] 的形式包裹哟 */
  logo?: string;
  /** logo 的样式 */
  logo_style?: string;
  /** 以 group 输出时，为 true 表示折叠内容 */
  collapsed?: boolean;
  /** 要输出的内容，即包裹在“折叠区域”中的内容 */
  data: string;
  /** 考虑到性能影响，只要要输出的 data 长度大于 1000 时才启用 group 输出。
   * 将该参数设置为 `true` 可以强制启用折叠输出
   */
  force_group?: boolean;
  /** 默认情况下 `group_log` 受到 `settings.no_log` 设置项影响。
   * 将它设置为 `true`，则强制进行输出！
   */
  force_log?: boolean;
};
