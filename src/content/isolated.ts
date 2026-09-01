/** 运行在与网站脚本隔离的环境中 */

// #region log

const raw_log = console.log;
const raw_warn = raw_log; // console.warn;

// 翡翠色
const default_style = `color:#38b48b`;
// 蔷薇色
const lite_warn_style = `background-color:#e9546b;color:white;font-weight:bold;`;

const _logger = {
  log(title: string, ...args: unknown[]) {
    raw_log(`%c[CureMiracle-Content ${title}]`, default_style, ...args);
  },
  warn(title: string, ...args: unknown[]) {
    raw_warn(`%c[CureMiracle-Content ${title}]`, lite_warn_style, ...args);
  },
};

// #endregion
