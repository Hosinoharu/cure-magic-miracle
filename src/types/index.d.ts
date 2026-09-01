declare namespace Browser {
  export = chrome;
}

/** 由 vite define 定义的变量，为 true 表示当前出于调试 ui 阶段 */
declare const __IS_DEV_UI__: boolean;
/** 由 vite define 定义的变量，为 true 表示当前要生成 firefox */
declare const __IS_FIREFOX__: boolean;
/** 由 vite define 定义的变量，记录最后一次构建的时间 */
declare const __BUILD_TIME__: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NormalFunction<T = any, R = any> = (...args: T[]) => R;
