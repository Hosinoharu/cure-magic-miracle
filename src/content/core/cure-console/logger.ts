/** 定义用于 log 输出的 api */

import { cure_setting } from "../cure-settings";
import cure_share from "../cure-share";

// 保存用到的 console API
const raw_log = console.log;
const raw_warn = console.warn;
const raw_group_start = console.group;
const raw_groupcollapsed_start = console.groupCollapsed;
const raw_group_end = console.groupEnd;
const raw_trace = console.trace;

/** 是否可以输出 */
const can_log = () => !cure_setting.no_log;

// #region 输出的样式

const cure_idol = "#FE5B9B";
const cure_wink = "#4060EE";
const cure_kyun = "#CD5FFB";
const cure_zukyoon = "#A9F9B5";
const cure_kiss = " #9988F1";

const base_style_prefix =
  "color:white; font-weight:bold; border-radius:3px; padding:2px 5px;";
/** 用于 lite_warn 输出时的样式 */
const lite_warn_style = `background-color:${cure_idol};${base_style_prefix}`;
/** 用于 warn 输出时的样式，cure-wink */
const warn_style = `background-color:${cure_wink};${base_style_prefix}`;
/** 输出特定操作信息时的颜色 */
const op_color: Record<Operation, string> = {
  Get: "#ff461f", // 朱砂
  Set: "#fff143", // 鹅黄
  Call: "#40de5a", // 草绿
  New: "#70f3ff", // 蔚蓝
};
/** 当输出 operation 消息时用这个样式 */
const op_style_prefix = "font-weight:bold; font-size:1.5em";

/** 用于输出时的样式，配合 `log_with_custom_logo` 使用 */
export const preset_styles = {
  default: `color:${cure_kyun}`,
  cure_idol: `color:${cure_idol};`,
  cure_wink: `color:${cure_wink};`,
  cure_zukyoon: `color:${cure_zukyoon};`,
  cure_kiss: `color:${cure_kiss};`,
  warn_style,
};

// #endregion

// #region logger helper

/** 提取出来的逻辑。用于整理出最终要输出的内容。
 *
 * 通常，一个输出内容包括 `[log] [scope] title`，并且 logo 和 title 都有各自的样式 style。
 * - `logo` 表示做出了哪些操作，通常是具备显著含义的
 * - `scope` 表示属于哪个范围 —— 因为一个网站中可能包含多个 iframe 等，它们的日志输出混在一起，需要标识区分
 * - `title` 真正要输出的内容
 *
 * @param title_style 用于 title 的样式
 * @param logo_style 用于 logo 的样式
 *
 * @returns 返回一个数组，如 ['%c[logo] [scope] %ctitle', logo_style, style]，便于后续直接 log 输出！
 */
function format_log_args(
  title: string,
  title_style?: string,
  logo?: string,
  logo_style?: string,
) {
  const styles = [] as string[];
  // 第一个参数就是格式化字符串，需要根据情况进行拼接
  const first_arg = [] as string[];

  // logo
  if (logo) {
    cure_share.ArrayFunc.push(first_arg, `%c[${logo}]`);
    cure_share.ArrayFunc.push(styles, logo_style || "");
  }

  // scope
  cure_share.ArrayFunc.push(first_arg, `%c[${cure_share.current_cure_url}]`);
  cure_share.ArrayFunc.push(styles, "");

  // title
  cure_share.ArrayFunc.push(first_arg, `%c${title}`);
  cure_share.ArrayFunc.push(styles, title_style || "");

  return [cure_share.ArrayFunc.join(first_arg, " "), ...styles];
}

/** 提取出来的逻辑。以 group 的形式输出，受到 `no_log` 设置项影响
 *
 * 也就是说，输出的格式是可折叠的，其格式类似：
 * ```
 * [logo] [scope] title
 *    这里就是可折叠的内容
 * ```
 */
function group_log({
  title,
  title_style,
  logo,
  logo_style,
  data,
  collapsed,
  force_group,
  force_log,
}: GroupLogParams) {
  if (!force_log && !can_log()) return;

  const log_args = format_log_args(title, title_style, logo, logo_style);
  // 没有数据就只需要输出标题啦
  if (!data) {
    raw_log(...log_args);
  }
  // 使用 console.group 比 console.log 更消耗性能！
  // 只有当输出的内容很长时才进行 group 输出，便于折叠内容
  else if (force_group || data.length > 500) {
    const group_start = collapsed ? raw_groupcollapsed_start : raw_group_start;
    group_start(...log_args);
    raw_log(data);
    raw_group_end();
  } else {
    raw_log(...log_args, `\n${data}`);
  }
}

// #endregion

// #region log API

/** 轻微警告，不会受 no_log 设置项影响。
 *
 * 输出样式: `[name] [frame-url] - title - ...`
 */
export function slight_warn(title: string, ...args: unknown[]) {
  raw_warn(
    "%c[CureMiracle]",
    lite_warn_style,
    `[${cure_share.current_cure_url}] - ${title} -`,
    ...args,
  );
}

/** 重度警告，不会受 no_log 设置项影响
 *
 * 输出样式: `[name] [url] - title - ...`
 */
export function warn(title: string, ...args: unknown[]) {
  raw_warn(
    "%c[CureMiracle]",
    warn_style,
    `[${cure_share.current_cure_url}] - ${title} -`,
    ...args,
  );
}

type LogWithLogoParams = {
  logo?: string;
  style?: keyof typeof preset_styles;
  /** 强制输出，不受 `no_log` 配置项影响 */
  force?: boolean;
  data?: unknown[];
};

/** 输出内容到控制台，但是有一个小小 Logo
 *
 * 输出样式: `[extension name] [logo] [url] data`
 */
export function log_with_logo(params: LogWithLogoParams) {
  if ((!params.force && !can_log()) || !params.data) return;

  const logo = params.logo || "☆";
  const style = params.style || "default";
  raw_log(
    `%c[CureMiracle] [${logo}]`,
    preset_styles[style],
    `[${cure_share.current_cure_url}]`,
    ...params.data,
  );
}

type LogWithGroupParams = {
  /** group 的标题 */
  title: string;
  /** 要输出的内容 */
  data: string;
  /** group 的标题前的 logo，默认为 '☆' */
  logo?: string;
  /** 为 true 表示以 group 输出时默认折叠内容，而不是展开它 */
  collapsed?: boolean;
  /** 强制进行 group 输出，即使 data 很短，该设置项主要用于输出堆栈信息 */
  force_group?: boolean;
  /** 强制输出，即使 no_log 设置项为 true */
  force_log?: boolean;
};

/** 以 group 的形式输出内容!
 *
 * 其输出的内容形如 `> title \n data`
 */
export function log_with_group(params: LogWithGroupParams) {
  group_log({
    title: params.title,
    title_style: preset_styles.default,
    logo: params.logo,
    logo_style: preset_styles.default,
    data: params.data,
    collapsed: params.collapsed,
    force_group: params.force_group,
    force_log: params.force_log,
  });
}

/** 调用 console.trace API 输出堆栈，它会包含本插件的堆栈，受到 no_log 设置项影响
 *
 * 输出格式 `[logo] title`
 *
 * 可在浏览器开发者工具中关闭【其自动展开】功能哟。
 *
 * @param title 默认情况下，只需要给出 title 即可，将输出当前堆栈。
 * 其他参数都是用于输出【Operation】信息的，需要提供样式
 * @param style 展示该 title 的样式，比如加点颜色之类的
 * @param logo 输出哪个操作，这样将输出固定的样式
 *
 */
export function log_with_stack(
  title: string,
  logo?: Operation | string,
  style: keyof typeof preset_styles = "default",
) {
  if (!can_log()) return;

  if (!logo) return raw_trace(title);

  const logo_style = cure_share.ObjectFunc.hasOwn(op_color, logo)
    ? `color:${op_color[logo as Operation]};${op_style_prefix}`
    : preset_styles.default;

  const log_args = format_log_args(
    title,
    preset_styles[style],
    logo,
    logo_style,
  );
  raw_trace(...log_args);
}

// #endregion

/** 脚本注入完成时调用哟 */
export function log_after_init() {
  raw_log(
    `%c ヾ(≧▽≦*)o Cure Magic ☆ Miracle ♡ [${cure_share.current_cure_url}]  `,
    `background-color:${cure_wink};font-size:1.5em;border-radius:6px;padding:6px`,
  );
}
