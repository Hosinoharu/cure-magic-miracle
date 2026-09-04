/** 冻结随机性，包括时间 */

import cure from "./cure";
import { TimeStorage } from "../cure-storage";

function hook_Math_random() {
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Math.random",
    obj: Math,
    property: "random",
    des: "Math.random",
    init_obj: {
      call_new_no_log: true,
      call_handler: function lovejsdebugger_random(
        this: Date,
        hooked_target: NormalFunction,
        ...args: unknown[]
      ) {
        if (cure.cure_setting.freeze_random) {
          return cure.cure_setting.freeze_random;
        }
        return cure.share.ReflectFunc.apply(hooked_target, this, args);
      },
    },
    default_value: false,
  });
  // #cure-tip bind-setting.freeze_random
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "freeze_random",
    enable_func: () => {
      cure.hooker_setting.Math_random = true;
    },
    cancel_func: () => {
      cure.hooker_setting.Math_random = false;
    },
  });
}

/*
   检测 debugger 的方式之一就是计算时间的流逝，只要断点断住了，时间上就有微小的差距啦
   所以需要 hook 所有关于时间上的 API，目前主要有
   - Date API，直接 hook Date 这个构造函数
   - performance.now 等 api
   
   获取当前的时间戳有几种种形式
    1. let x = new Date(); 然后调用 x 的各种方法
      我这么处理：在以无参数形式调用 new Date 时，固定其时间戳
      即 new Date(value) 的形式返回。当以参数调用 new Date 时就不进行额外处理
    2. let x = Date.now();
      此时直接固定该方法的返回值即可
    3. 还有一种 let x = Date(); 然后调用 Date.parse() 获取时间戳
*/
export function freeze_02() {
  hook_Math_random();

  // #cure-tip 时间戳定位的逻辑

  // #cure-tip init-cure.storage.time
  const time_storage = new TimeStorage();
  cure.storage.time = time_storage;

  /** new Date 的时间戳目前是 13 位，如果 v 的长度不够则补齐零 */
  function time_setter(v: number) {
    if (typeof v !== "number") {
      v = Number(v);
      if (isNaN(v)) {
        throw new cure.share.CureError("Invalid timestamp: " + v);
      }
    }
    if (v === 0) {
      return v;
    }

    let res = cure.share.ElseFunc.to_normal_string(v);
    // 等于 13 位不处理
    if (res.length === 13) {
    }
    // 小于 13 位补零
    if (res.length < 13) {
      res = cure.share.StringFunc.padEnd(res, 13, "0");
      cure.console.logger.log_with_logo({
        logo: "Freeze",
        data: [`Extend timestamp to 13 length: ${v} =>`, parseInt(res)],
      });
    }
    // 大于 13 位不进行截断，因为还需要根据时间戳定位呢
    else if (res.length > 13) {
      /* res = res.substring(0, 13); */
    }

    return parseInt(res);
  }

  /** 在减缓时间流速时，固定让时间戳增加指定的数值 */
  const time_step = 5;

  // #cure-tip hook-Date构造函数逻辑
  const date_constructor: CallNewHandler = function curemiracle_Date(
    hooked_target: NormalFunction,
    ...args: unknown[]
  ) {
    let freeze_time = cure.cure_setting.freeze_time;
    // 开启了 freeze 设置，并且是无参数调用时，返回固定值
    // 此时不需要补足 16 位啦，因为都可以手动设置了
    if (freeze_time > 0 && args.length === 0) {
      if (cure.cure_setting.slow_time) {
        freeze_time += time_step;
        cure.cure_setting.freeze_time = freeze_time;
        // 记录这个时间戳生成的堆栈咯
        time_storage.set(
          cure.share.ElseFunc.to_normal_string(freeze_time),
          cure.tool.stack_handler.curemiracle_get_caller_location(false),
        );
      }
      // @ts-ignore
      return new hooked_target(freeze_time);
    }
    // @ts-ignore
    let r = new hooked_target(...args);
    // 长度补足到 16 位，即利用现在的时间戳，生成新的时间戳
    if (cure.cure_setting.long_time) {
      // 先获取到时间戳的数值形式
      const v = cure.share.DateFunc.get_time(r);
      // @ts-ignore
      // 然后加上字符串咯
      r = new hooked_target(parseInt(v + "000"));
    }
    // 记录这个时间戳生成的堆栈咯
    time_storage.set(
      cure.share.ElseFunc.to_normal_string(cure.share.DateFunc.get_time(r)),
      cure.tool.stack_handler.curemiracle_get_caller_location(false),
    );
    return r;
  };

  // #cure-tip hook-Date普通调用逻辑
  const date_function: CallNewHandler = function curemiracle_Date(
    _hooked_target: NormalFunction,
    ..._args: unknown[]
  ) {
    // 因为它返回的是一个字符串，所以这样做：
    // 调用它的构造函数形式，触发 hook 逻辑，获得处理后的 Date 对象
    // 然后 toString() 返回咯
    return cure.share.DateFunc.to_string(new Date());
  };

  // #cure-tip hook-Date.now
  const date_now: CallNewHandler = function curemiracle_now(
    hooked_target: NormalFunction,
    ..._args: unknown[]
  ) {
    let freeze_time = cure.cure_setting.freeze_time;
    if (freeze_time > 0) {
      if (cure.cure_setting.slow_time) {
        freeze_time += time_step;
        cure.cure_setting.freeze_time = freeze_time;
        time_storage.set(
          cure.share.ElseFunc.to_normal_string(freeze_time),
          cure.tool.stack_handler.curemiracle_get_caller_location(false),
        );
      }
      return freeze_time;
    }

    let r: number = hooked_target();
    if (cure.cure_setting.long_time) {
      // @ts-ignore
      r = parseInt(cure.share.ElseFunc.to_normal_string(r) + "000");
    }
    time_storage.set(
      cure.share.ElseFunc.to_normal_string(r),
      cure.tool.stack_handler.curemiracle_get_caller_location(false),
    );
    return r;
  };

  // #cure-tip hook-Performance.now
  let per_freeze_time = 0; // 记录 performance.now 的固定值哟
  const Performance_p_now = function curemiracle_now(
    this: Performance,
    hooked_target: NormalFunction,
    ...args: unknown[]
  ) {
    // 如果开启了 freeze_time，那么 performance.now 需要获取此时此刻它的值，然后固定
    // 不能直接使用时间戳 —— 这是实践之后的处理啦
    if (cure.cure_setting.freeze_time > 0) {
      if (per_freeze_time === 0) {
        per_freeze_time = cure.share.ReflectFunc.apply(
          hooked_target,
          this,
          args,
        );
      } else if (cure.cure_setting.slow_time) {
        per_freeze_time += time_step;
      }
    }
    // 取消原来的值哟
    else {
      per_freeze_time = 0;
    }

    // 如果进行了 hook 就返回固定值，否则返回新的值
    return per_freeze_time !== 0
      ? per_freeze_time
      : cure.share.ReflectFunc.apply(hooked_target, this, args);
  };

  // #cure-tip bind-hooker.Date
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Date",
    obj: globalThis,
    property: "Date",
    des: "Date",
    init_obj: {
      call_new_no_log: true,
      new_handler: date_constructor,
      call_handler: date_function,
    },
    default_value: true,
  });

  // #cure-tip bind-hooker-Date_now
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Date.now",
    obj: Date,
    property: "now",
    des: "Date.now",
    init_obj: {
      call_new_no_log: true,
      call_handler: date_now,
    },
    default_value: true,
  });

  // #cure-tip bind-hooker-Date_parse
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Date.parse",
    obj: Date,
    property: "parse",
    des: "Date.parse",
    init_obj: {},
    default_value: true,
  });

  // #cure-tip bind-hooker-Performance_now
  const h = cure.tool.setting_binder.create_hooker_switcher({
    setting: "Performance.prototype.now",
    obj: Performance.prototype,
    property: "now",
    des: "Performance.prototype.now",
    init_obj: {
      call_new_no_log: true,
      call_handler: Performance_p_now,
    },
    default_value: false,
  });

  // #cure-tip bind-setting.freeze_time
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "freeze_time",
    enable_func: () => {
      h.hook_it();
      cure.console.logger.log_with_logo({
        logo: "Freeze",
        data: ["performance.now():", performance.now()],
      });
    },
    cancel_func: () => {
      h.unhook_it();
    },
    setter: time_setter,
  });
  // #cure-tip bind-setting.slow_timebind-setting
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.cure_setting,
    setting: "slow_time",
    enable_func: () => {
      let time = cure.cure_setting.freeze_time;
      // @ts-ignore
      if (time === 0) {
        time = cure.share.DateFunc.now();
        cure.cure_setting.freeze_time = time;
      }
      cure.console.logger.log_with_logo({
        logo: "Freeze",
        data: ["开启 slow_time 设置，从该时间戳开始按规律递增:", time],
      });
    },
    cancel_func: () => {
      if (cure.cure_setting.freeze_time !== 0) {
        cure.console.logger.log_with_logo({
          logo: "Freeze",
          data: ["取消 slow_time 设置，同时强制取消 freeze_time 设置"],
        });
        cure.cure_setting.freeze_time = 0;
      }
    },
  });
}
