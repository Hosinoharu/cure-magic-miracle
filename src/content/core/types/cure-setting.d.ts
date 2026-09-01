/** 关于反调试的配置项 */
type AntiDebuggerSetting = {
  /** 是否启用 hook，默认情况为 true，表示进行 hook */
  enable_hook: boolean;
  /** 是否启用自定义的断点功能，主要是在禁用所有断点时，辅助 Hook 来断点 */
  cure_debug: boolean;
  /** 为 `true` 时表示在 hook 代码初始化之后断点 */
  debug_after_init: boolean;
  /** 监控 cookie 的读写 */
  cookie: boolean;
  /** 去除动态生成的 debuuger 语句 */
  remove_debugger: boolean;
  /** hook eval 咯 */
  hook_eval: boolean;
  /** 取消 setInterval 调用，主要用于反调试，避免内存爆破 */
  no_interval: boolean;
  /** 取消 setTimeout 调用 */
  no_timeout: boolean;
  /** 是否禁用插件输出 */
  no_log: boolean;
  /** 开启 hooker 的所有 log 用于分析 */
  hooker_log: boolean;
  /** 禁用控制台输出，也就是禁用 console.log 等，避免网站的反调试 */
  no_console: boolean;
  /** 拦截网页自动跳转 */
  stop_redirect: boolean;
  /** 每个 hooker 最大的输出次数，当达到该次数后将阻止 hooker 的输出。
   * 因为大量调用 console.log 会造成浏览器卡顿，即便是输出大量字符串也不行呐。
   * 当然其后台依然在运行、记录实际的调用次数啦。
   *
   * 默认 1000。
   */
  max_log_count: number;
  /** 是否 hook worker 内部的函数调用 */
  hook_worker: boolean;
  /** 当前插件的 id，为了配合 curedebug 功能 */
  extension_id: string;
  /** 输出网站所有处理的错误的堆栈信息，用于反调试 */
  catch_stack: boolean;
};

/** 关于冻结随机性的配置项 */
type FreezeRandomSetting = {
  /** 是否固定 Math.random 返回值。如果取值为 0 表示不固定哟*/
  freeze_random: number;
  /** 是否固定 new Date 返回的时间戳，
   *
   * 取值为 0，则表示不固定。
   *
   * 取值为任意正数，则表示指定固定的时间戳。
   */
  freeze_time: number;
  /** 是否降低时间流速，当创建 Date 对象时，固定比上一次相差 10。
   *
   * 比如第一次获取时间戳为 `1`，
   * 那么第二次获取的一定为 `11`，
   * 第三次获取的一定为 `21`，依此类推。
   *
   * 当该设置项启动时需要一个起始时间戳，默认设置为启动该设置时的时间戳。
   *
   * 内部可以这样实现：启动该设置时，如果 `freeze_time` 为 0，
   * 那么就让 `freeze_time` 的值等于当前时间戳，
   * 然后每次获取时间戳时，给 freeze_time 增加 `10` 不就好了！
   */
  slow_time: boolean;
  /** 在利用时间戳定位，如果网站对时间戳进行了截断，那么就将时间戳改成 16 长度的
        如果网站对时间戳进行了处理，比如将 13 位时间戳转为 10 位时间戳
        比如进行了 Math.round(Date.now() / 1e3) 这样的处理
        此时在控制台搜索时会有很多结果，同时也容易造成忽略，因为经过了 Math.round 这样的处理
        所以，为了便于查找，控制时间戳的程度并且进行补齐！
        比如在原本 13 位时间戳后面添加 000，这样经过 Date.now() / 1e3 处理之后也便于快速定位！
     */
  long_time: boolean;
};

/** 全局配置项 */
type CureSetting = AntiDebuggerSetting & FreezeRandomSetting;

type CreateSettingSwitcherParam = {
  /**  父设置项。因为设置项有多种，所以需要指定。比如有 `A.x` 和 `B.y` 就是有两个不同的父设计项。 */
  target: { [k: string]: unknown };
  /** 设置项的名称！其实就是对应设置项 `target[setting]` */
  setting: string;
  /** 设置项启动时调用这个函数 */
  enable_func: NormalFunction;
  /** 设置项取消时调用这个函数，有些设置项一旦启动就不需要取消所以可以不设置。 */
  cancel_func?: NormalFunction;
  /** 有些设置项在 set 值时可能有个性化操作，所以可以传入一个中间函数处理值。比如时间戳需要补齐 13 位。 */
  setter?: NormalFunction;
  /** 如果为空，则会在 “没有原始值” 的情况下报错。
   * 比如 `cure_settings.xx` 原本没有设置值，现在还不设置默认值，则运行时会报错哟。
   *
   * 算是一种“兜底”的措施。
   */
  default_value?: boolean | string | number;
};

type CombineHookerSettingParam = {
  /** 与 hooker 关联的 `cure_hooker` 配置项名称，也作为 cure_hooked 的属性名！
   *
   * 直接传入属性的访问路径，比如 `console.log` 这样就可以了
   */
  setting: string;
  /** 比如要 `hook globalThis.eval` 时，该参数就是 `globalThis` */
  obj: unknown;
  /** 比如要 `hook globalThis.eval` 时，该参数就是 `eval`，即要 hook 的方法的名称 */
  property: string;
  /** 关于本次 hook（或者说 hooker）的描述信息 */
  des: string;
  /** 用于配置 methoed_hooker 的字典！主要用于创建方法的 hooker */
  init_obj: MethodHookerInitObj;
  /** 所需要的预先 setter */
  setter?: { (v: unknown): unknown };
  /** 该 hooker 配置项的默认值。如果在 `cure_hooker` 中存在配置项，则忽略此处的配置项哟 */
  default_value: boolean;
  /** 一旦设置为 true，表示功能开启无法关闭哟 */
  keep_on?: boolean;
};

/** 所有配置项 */
type AllSetting = {
  /** 整体的配置项 */
  cure_setting: CureSetting;
  /** 专门配置 hooker 的配置项 */
  hooker_setting: HookerSetting;
};
