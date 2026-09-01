/** 保存 Date 相关 API */

import { create_clean_object, save_raw_method } from "./helper";

export const DateFunc = create_clean_object(
  {
    now: Date.now,
    /** 调用它转换时间戳的字符串形式 */
    to_string: save_raw_method(Date.prototype.toString),
    /** 对应 Date.prototype.getTime */
    get_time: save_raw_method(Date.prototype.getTime),
  },
  true,
);
