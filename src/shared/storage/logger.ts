/** 算是较为同样的日志输出了 */

const raw_log = console.log;
const raw_warn = raw_log; // console.warn;

type LogoKind = "get" | "set" | "del" | "init" | "☆" | "error" | "todo";
/** 不同 Logo 使用的样式 */
const logo_style_map: { [key in LogoKind]: string } = {
  get: "color: #009688; font-weight: bold;",
  set: "color: #ff9800; font-weight: bold;",
  del: "color: #f44336; font-weight: bold;",
  init: "color: #2196f3; font-weight: bold;",
  error: "color: #e71809; font-weight: bold;",
  todo: "background-color: #df4f07; font-weight: bold;",
  "☆": "color: #9c27b0; font-weight: bold;",
};

/** 可以在某个类中创建该 Logger，输出时带有指定前缀。不使用前缀则是默认输出咯 */
export class Logger {
  constructor(private prefix = ">") {}

  /** 普通输出，不带样式，但带上前缀*/
  log(...args: unknown[]) {
    raw_log(`[${this.prefix}]`, ...args);
  }

  /** 输出内容时带有一个 logo，最终样式类似 `[logo] <title>` */
  log_with_logo(logo: LogoKind | "warn", title: string, ...args: unknown[]) {
    if (logo === "warn") {
      raw_warn(`[warn] [${this.prefix}] <${title}>`, ...args);
    } else {
      raw_log(
        `%c[${logo}] [${this.prefix}]`,
        logo_style_map[logo],
        `<${title}>`,
        ...args,
      );
    }
  }
}
