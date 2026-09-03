/** 这里定义一些配置项的信息，用于 ui 初始化的 */

/** 默认的、关于反调试的 cure_setting 配置项*/
export const default_ani_debugger_setting: OneSetting<AntiDebuggerSetting>[] = [
  // {
  //     name: 'enable_hook',
  //     type: 'switch',
  //     des: '启用 hook，实际情况中不会处理它',
  // },
  {
    name: "no_log",
    type: "switch",
    des: "禁止 Hook 的控制台输出 - 默认开启",
    info: "仅不输出 Hook 信息，不影响插件注入的 API 的输出",
  },
  {
    name: "remove_debugger",
    type: "switch",
    des: "去除动态生成的 debugger 语句 - 默认开启",
    info: "仅用于 Function，除非启用了 Hook eval",
  },
  {
    name: "debug_after_init",
    type: "switch",
    des: "在插件注入代码后断点",
    info: "无法确保一定会在网站的代码执行前断点",
  },
  {
    name: "cure_debug",
    type: "switch",
    des: "cure debug",
    info: "当禁用全部断点时，通过 XHR 断点 curedebug 来断住",
  },
  {
    name: "no_console",
    type: "switch",
    des: "禁止网站的控制台输出",
    info: "这会造成浏览器的日志断点失效",
  },
  {
    name: "hook_eval",
    type: "switch",
    des: "EVAL!!! Hook eval",
    info: "强烈警告！因为作用域问题，可能造成网站功能异常",
  },
  {
    name: "no_interval",
    type: "switch",
    des: "禁止网站的 setInterval",
    info: "警告！可能造成网站功能异常",
  },
  {
    name: "no_timeout",
    type: "switch",
    des: "禁止网站的 setTimeout",
    info: "警告！可能造成网站功能异常",
  },
  {
    name: "cookie",
    type: "switch",
    des: "监控 cookie 读写",
    info: "也会监控到服务器响应头中的 Set-Cookie",
  },
  {
    name: "stop_redirect",
    type: "switch",
    des: "阻止网站跳转",
    info: "可能需要先和网站交互（如鼠标点击）才能有效",
  },
  {
    name: "hook_worker",
    type: "switch",
    des: "监控 Worker 内部的 API 调用",
    info: "当前仅对使用 Blob url 的 worker 有效",
  },
  {
    name: "max_log_count",
    type: "input-int",
    des: "最大输出次数",
    info: "默认 1000，超过之后禁用输出",
  },
  {
    name: "hooker_log",
    type: "switch",
    des: "输出 Hooker 日志",
    info: "Hook API 的详细调用日志",
  },
  {
    name: "catch_stack",
    type: "switch",
    des: "输出网站处理过的 Error 堆栈信息",
  },
];

/** 默认的、关于冻结随机性的 cure_setting 配置项 */
export const default_freeze_setting: OneSetting<FreezeRandomSetting>[] = [
  {
    name: "slow_time",
    type: "switch",
    des: "减缓时间流速",
    info: "相关获取时间的 API 将返回缓慢递增的时间",
  },
  {
    name: "long_time",
    type: "switch",
    des: "时间戳补长到 16 位",
    info: "用于时间戳定位，因为网站可能删去了时间戳的后 3 位",
  },
  {
    name: "freeze_time",
    type: "input-int",
    des: "固定时间戳",
    info: "自动补足 13 位长度，超过则忽略",
  },
  {
    name: "freeze_random",
    type: "input-int",
    des: "固定 Math.random",
  },
];

/** 插件配置 */
export const default_extension_setting: OneSetting<ExtensionSetting>[] = [
  {
    name: "dev_mode",
    type: "switch",
    des: "Dev Mode - Hook 所有网页",
    info: "需要刷新网页才能生效",
  },
];
