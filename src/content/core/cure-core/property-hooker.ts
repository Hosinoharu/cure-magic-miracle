import cure_share from "../cure-share";
import cure_tool from "../cure-tool";
import { BasicHooker, BasicPropertyHooker, empty_str } from "./base";

/** hook 属性的值。
 *
 * 如 `hook window.x`，这样就能知道何时读写 `.x` 属性。
 *
 * 采用重写 `getter、setter` 的方式来 hook 属性。
 */
export class PropertyValueHooker extends BasicHooker {
  constructor(obj: object, property: PropertyKey, des: string) {
    super(obj, property, des);
    this.init_raw_value();
  }

  /** 在 hook 属性时本函数基本无用 */
  protected get_hooker() {}
}

/** hook 属性自身。
 *
 * 具体如 `hook window.x`，这样就能知道 `window.x` 这个对象自身的操作。
 *
 * 能知道像 `window.x.a = 1` 这样的赋值该对象的某个属性等等。
 *
 */
export class PropertyHooker extends BasicPropertyHooker {
  // 重写 get、set 属性的逻辑
  protected override curemiracle_get_property(
    target: object,
    property: PropertyKey,
    receiver?: unknown,
  ) {
    const value = super.curemiracle_get_property(target, property, receiver);
    // 如果该属性已经被 hook 过，那么 value 是一个 Proxy 对象，
    // 此时就不要处理了。因为上面的 cure_tool.Reflect.get 调用会访问到该属性的
    // 属性描述符中的 getter 啦。
    const is_hooked =
      cure_tool.proxy_handler.is_cure_proxy(value) ||
      cure_tool.property_handler.is_hooked_property(target, property);
    // 如果取消了 hook 或者该属性没有被 hook，则直接返回咯
    if (this.no_intercept || is_hooked) return value;

    return this.curemiracle_process_value("Get", value, property);
  }

  protected override curemiracle_set_property(
    target: object,
    property: PropertyKey,
    value: unknown,
    receiver?: unknown,
  ) {
    super.curemiracle_set_property(target, property, value, receiver);

    const is_proxy = cure_tool.proxy_handler.is_cure_proxy(value);
    // value 可能是一个 Proxy，所以先获取其对应的底层对象
    // value = cure_tool.proxy.get_raw_obj_from_proxy(value);

    // 确认该属性是否被 hook 过，如果被 hook 过了，则不需要进行输出，会进入到其 setter 中
    // 同样，如果 value 是一个 Proxy，也不需要进行输出啦
    const is_hooked =
      is_proxy ||
      cure_tool.property_handler.is_hooked_property(target, property);
    if (this.no_intercept || is_hooked) return;

    return this.curemiracle_process_value("Set", value, property);
  }
}

/** 专门用来 hook 属性描述符的 getter/setter 的哟。
 *
 * 相比较 MethodHooker，它和该属性的【对象】共用一套配置，在输出上也有所调整，
 * 并不会让它看上去像函数调用，而像是普通属性访问啦。
 *
 * 比如 `hook document.cookie` 时，肯定会创建 `PropertyValueHooker` 并设置 logger、debugger 等，
 * 但是它具备 getter/setter，所以会创建 `PropertyGetterSetterHooker` 来 hook getter/setter。
 * 同时给 `PropertyGetterSetterHooker` 设置的 logger/debugger 都从 `PropertyValueHooker` 继承过来。
 *
 * 将使用闭包机制实现这种 `logger/debugger` 的共享。
 *
 */
export class PropertyGetterSetterHooker extends BasicPropertyHooker {
  constructor(
    /** 要 hook 的 getter 或 setter 函数 */
    target: NormalFunction,
    des: string,
    /** true 表示 getter，否则表示 setter */
    private is_getter: boolean,
    /** 说明它是来自于哪个 PropertyHooker 控制的 */
    private bind_property_hooker: BindHooker,
  ) {
    super(target, empty_str, des);
    this.is_single_obj = true;
    this.init_raw_value();
  }
  // 需要重写函数调用时的输出嘛
  protected override curemiracle_apply(
    target: NormalFunction,
    this_arg: object,
    args: unknown[],
  ) {
    let v;
    if (this.is_getter) {
      // 触发 getter 逻辑，获取底层的值
      v = cure_share.ReflectFunc.apply(target, this_arg, args);
      // 进行 logger、debugger
      v = this.bind_property_hooker.process_value("Get", v);
    } else {
      // 这里就是输出第一个参数嘛，就是 Set 的值咯
      this.bind_property_hooker.process_value("Set", args[0]);
      // 此处就是触发底层的 getter/setter 逻辑哟
      v = cure_share.ReflectFunc.apply(target, this_arg, args);
    }
    return v;
  }
}
