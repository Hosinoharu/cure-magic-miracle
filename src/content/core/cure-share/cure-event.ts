/** 存储关于设置事件的 API */

import { create_clean_object, save_raw_method } from "./helper";

export const EventFunc = create_clean_object(
  {
    /** 编写相关代码应当保留原本的注释，方便对照 */
    add_event: save_raw_method(EventTarget.prototype.addEventListener) as (
      _this: EventTarget,
      type: string,
      listener: NormalFunction,
      options?: boolean | AddEventListenerOptions,
    ) => void,
    remove_event: save_raw_method(EventTarget.prototype.removeEventListener),
  },
  true,
);
