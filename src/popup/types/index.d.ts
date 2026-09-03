/** 一个 cure_setting 配置项的基本要求 */
type OneSetting<T> = {
  /** 配置项的名称 */
  name: keyof T;
  /** 配置的种类：开关型、数字型、字符串型 */
  type: "switch" | "input-int" | "input-str";
  /** 默认值，为空则根据 `type` 确定为 `false、""（空字符串）`" */
  default?: string | number | boolean;
  /** 展示用的信息 */
  des: string;
  /** 一些需要额外说明的信息，通过小弹窗显示 */
  info?: string;
};
