/** 生成不同构建场景下的 vite UserConfig */

import vue from "@vitejs/plugin-vue";
import fs from "fs";
import { fileURLToPath } from "node:url";
import path from "path";
import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { InlineConfig, type Plugin } from "vite";
import pkg from "./package.json";
import { get_manifest } from "./src/manifest";

// #region init variables

// update manifest
const build_target: "chrome" | "firefox" = "chrome";
const manifest = get_manifest(build_target);
manifest.version = pkg.version;
manifest.description = pkg.description;
manifest.homepage_url = pkg.homepage;

/** 项目根目录 */
const root_dir = path.dirname(fileURLToPath(import.meta.url));
const out_dir = path.join(root_dir, "dist", build_target);
/** manifest.ts 所在的目录，固定为 ./src 中 */
const manifest_dir = path.join(root_dir, "src");

// #endregion

// #region user config

/** 多入口构建 background、popup 等的配置 */
export function get_core_config() {
  const input = {
    background: path.join(manifest_dir, "background/index.ts"),
    popup: path.join(manifest_dir, "popup/index.html"),
  };

  const plugins: Plugin[] = [
    ...add_vue_plugins(),
    plugin_write_manifest_file(manifest),
    plugin_copy_static_files(),
  ];

  const config: InlineConfig = {
    // 不使用默认的 vite.config.ts 文件
    configFile: false,
    base: "./",
    root: "./src",
    plugins,
    define: {
      /** 用于标记当前正处于调试 ui，此处应该保持为 false */
      __IS_DEV_UI__: false,
      /** 标记当前是否要生成 firefox 版本 */
      __IS_FIREFOX__: build_target === "firefox",
      __BUILD_TIME__: `"${Logger.get_time()}"`,
    },
    build: {
      outDir: out_dir,
      emptyOutDir: true,
      rolldownOptions: {
        input,
        output: {
          // 按照插件的目录规范写入
          entryFileNames(chunk_info) {
            const t = chunk_info.name;

            if (
              t === "background" ||
              t === "popup" ||
              t === "options" ||
              t === "devtools"
            ) {
              return `${t}/index.js`;
            }

            return `[name].js`;
          },
          chunkFileNames: "shared/[name].js",
          assetFileNames: "shared/[name].[ext]",
        },
      },
    },
    resolve: {
      alias: {
        "@": manifest_dir,
      },
    },
  };

  return config;
}

/** 单独构建 content_scripts 的配置 */
export function get_content_config(target: "main" | "isolated") {
  const input_map: Record<typeof target, string> = {
    main: path.join(manifest_dir, "content/main.ts"),
    isolated: path.join(manifest_dir, "content/isolated.js"),
  };

  const config: InlineConfig = {
    configFile: false,
    build: {
      outDir: path.join(out_dir, "content"),
      emptyOutDir: false,
      rolldownOptions: {
        input: input_map[target],
        output: {
          entryFileNames: "[name].js",
          format: "iife",
          comments: false,
          keepNames: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": manifest_dir,
      },
    },
  };

  return config;
}

// #endregion

// #region about vite plugin

/** 添加 vue、element-plus 的插件 */
function add_vue_plugins(): Plugin[] {
  const types = path.join(manifest_dir, "types");
  return [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: path.join(types, "element-plus-auto-imports.d.ts"),
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: path.join(types, "element-plus-components.d.ts"),
    }),
  ] as Plugin[];
}

function plugin_write_manifest_file(manifest: object): Plugin {
  const name = "write-manifest-file";
  const logger = new Logger(name);

  return {
    name,

    closeBundle() {
      const filename = path.join(out_dir, "manifest.json");
      const content = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(filename, content);
      logger.info(path.relative(root_dir, filename));
    },
  };
}

/** 复制静态文件 */
function plugin_copy_static_files(): Plugin {
  const name = "copy-static-files";
  const logger = new Logger(name);

  function copy_static_files() {
    const tp_from = path.join(manifest_dir, "static");
    if (fs.existsSync(tp_from)) {
      const to = path.join(out_dir, "static");
      fs.cpSync(tp_from, to, { recursive: true });
      logger.info(path.relative(root_dir, to));
    } else {
      logger.warn("not found");
    }
  }

  return {
    name,

    closeBundle() {
      copy_static_files();
    },
  };
}

// #endregion

// #region helper functions

/** 用于 node 环境的日志输出 */
export class Logger {
  /** ANSI color */
  readonly #colors = {
    NORMAL: "\x1b[0m",
    // 这个用于时间戳
    TIME: "\x1b[38;5;245m", // gray
    HIGHLIGHT: "\x1b[36m", // cyan
    INFO: "\x1b[35m", // magenta
    WARN: "\x1b[33m", // yellow
    ERROR: "\x1b[31m", // red
  };

  static readonly #time_formatter = new Intl.DateTimeFormat("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  /** @param prefix 标识的日志前缀 */
  constructor(private readonly prefix: string) {}

  /** 获取当前时间 */
  static get_time() {
    return this.#time_formatter.format(new Date());
  }

  #log(level: "INFO" | "WARN" | "ERROR", title: string, ...args: unknown[]) {
    const time = `${this.#colors.TIME}[${Logger.get_time()}]`;
    const level_ = `${this.#colors[level]}${level}${this.#colors.NORMAL}`;
    const prefix = `${this.#colors.TIME}[${this.prefix}]${this.#colors.NORMAL}`;
    const title_ =
      title === "-"
        ? title
        : `${this.#colors.HIGHLIGHT}* ${title}${this.#colors.NORMAL}`;

    console.log(time, level_, prefix, title_, ...args);
  }

  /** 指定换行多少次，默认 1 次 */
  br(n = 1) {
    console.log("\n".repeat(n));
  }

  /** 输出分割线 */
  divide_line() {
    console.log("=".repeat(50));
    this.br();
  }

  info(...args: unknown[]) {
    this.#log("INFO", "-", ...args);
  }

  warn(...args: unknown[]) {
    this.#log("WARN", "-", ...args);
  }

  error(...args: unknown[]) {
    this.#log("ERROR", "-", ...args);
  }

  /** 以 INFO 输出的时具备 title，表示强调 */
  higlight(title: string, ...args: unknown[]) {
    this.#log("INFO", title, ...args);
  }
}

// #endregion
