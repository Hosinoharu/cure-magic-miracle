import cure_share from "../cure-share";

/** 全局设置，控制启用哪些功能。这里记录了默认初始配置值。*/
export const cure_setting =
  cure_share.ElseFunc.create_clean_object<CureSetting>(
    {
      extension_id: "this will be replaced by extension id automatically",
      enable_hook: true,
      debug_after_init: false,
      max_log_count: 1000,
      cure_debug: false,
      cookie: false,
      remove_debugger: true,
      hook_eval: false,
      no_interval: false,
      no_timeout: false,
      // 在注入后到初始化配置项这段时间还是要输出内容的
      // 所以这里取值为 false，但默认情况下插件会将其设置为 true
      no_log: false,
      hooker_log: false,
      no_console: false,
      stop_redirect: false,
      freeze_random: 0,
      freeze_time: 0,
      slow_time: false,
      long_time: false,
      hook_worker: false,
      catch_stack: false,
    },
    false,
    "CureSetting",
  );
