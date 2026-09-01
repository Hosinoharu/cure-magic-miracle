/** 供本目录中其它 .ts 文件使用的 API */

// #region create clean object

const create_obj = Object.create;
const freeze_obj = Object.freeze;
const define_prop = Object.defineProperty;
const set_proto = Object.setPrototypeOf;

/** 创建一个原型链为空的对象，它的初始值由另一个对象给出
 *
 * @param init 对象内容
 * @param freeze 是否冻结对象
 * @param tag_name 将作为对象的 `Symbol.toStringTag` 属性的名称
 */
export function create_clean_object<T extends object>(
  init?: T,
  freeze?: boolean,
  tag_name?: string,
): T {
  const obj = init ? set_proto(init, null) : create_obj(null);

  define_prop(obj, Symbol.toStringTag, {
    value: tag_name || "CureObject",
    configurable: false,
    enumerable: false,
    writable: false,
  });

  return freeze ? freeze_obj(obj) : obj;
}

// #endregion

/** 保存 Object 对象上的方法，方法名保持不变 */
export const ObjectFunc = create_clean_object(
  {
    defineProperty: Object.defineProperty,
    defineProperties: Object.defineProperties,
    hasOwn: Object.hasOwn,
    getOwnPropertyNames: Object.getOwnPropertyNames,
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
    keys: Object.keys,
    getPrototypeOf: Object.getPrototypeOf,
    setPrototypeOf: Object.setPrototypeOf,
    create: Object.create,
    freeze: Object.freeze,
    is_frozen: Object.isFrozen,
    entries: Object.entries,
    /** 调用 `Object.prototype.toString` 获取最原始的类型信息 */
    get_type_info: save_raw_method(Object.prototype.toString),
  },
  true,
);

/** 保存 Reflect 对象上的方法，方法名保持不变 */
export const ReflectFunc = save_raw_func(Reflect);

/** 保存 String 对象上的原型方法 */
export const StringFunc = save_proto_method(String.prototype);

/** 保存 Array 对象上的原型方法 */
export const ArrayFunc = save_proto_method(
  Array.prototype,
) as unknown as ArrayMethodToFunc;

// #region save func and method API

/** 保存对象 obj 上所有的函数（而不是方法），比如保存 `Reflect` 对象上的方法 */
export function save_raw_func<T>(obj: T): T {
  const result = create_clean_object() as { [key in keyof T]: T[key] };
  const names = ObjectFunc.getOwnPropertyNames(obj) as (keyof T)[];

  for (const n of names) {
    if (typeof obj[n] !== "function") continue;

    result[n] = obj[n];
  }

  return freeze_obj(result);
}

/** 保存插件中所用到的、所有方法的原始版本！主要针对需要实时 this 的方法。
 *
 * 保存的方式就是全都转为函数调用，而不是方法调用啦。
 *
 * ```js
 * // 保存 `String.prototype.indexof` 方法，仅仅供插件内部使用
 * // 因为后续也会 hook 该方法，所以也是必须保存一份原始版本来使用啦
 * save_raw_method(String.prototype.indexof);
 *
 * // 原来的使用方式
 * "test".indexof(t)
 *
 * // 那么在插件中应该改为这样的调用方式
 * cure_tools.StringFunc.indexof("test", "t")
 * ```
 *
 */
export function save_raw_method<T extends NormalFunction>(
  raw: T,
): MethodToFunc<T> {
  const _raw = raw;
  return function (_this: ThisParameterType<T>, ...args: Parameters<T>) {
    return ReflectFunc.apply(_raw, _this, args);
  };
}

// #region save proto method

/** 保存原型对象 obj 上的所有方法，将它们都转为函数式调用。
 *
 * 比如传入 `String.prototype`，那么返回的就是一个对象，该对象上保存了 `String.prototype` 上的所有方法。
 */
export function save_proto_method<T>(obj: T) {
  // result 的键就是 obj 的、所有方法的属性名
  const result = create_clean_object() as { [key in keyof T]: T[key] };
  const names = ObjectFunc.getOwnPropertyNames(obj) as (keyof T)[];

  for (const n of names) {
    if (typeof n !== "string" || is_ignore_func_name(n)) continue;

    if (typeof obj[n] === "function") {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        result[n] = save_raw_method(obj[n]);
      } catch {}
    }
  }

  return freeze_obj(result) as ObjectMethodToFunc<T>;
}

/** 在 hook X.prototype 上的方法时，需要判断某个属性名是否应该 hook。
 *
 * 比如 `constructor` 方法等就不应该 hook 啦。所以用本方法判断！
 */
function is_ignore_func_name(n: string) {
  return n === "constructor" || n === "toString" || n === "toLocaleString";
}

// #endregion

/** 保存对象某个属性的原始 getter
 *
 * ```js
 * const raw_getter = save_raw_property_getter(obj, "property");
 * raw_getter(p); // 现在只需要传入对象即可，该对象必须是 obj 的实例对象
 * ```
 */
export function save_raw_property_getter<T, ReturnType>(
  obj: T,
  property: PropertyKey,
) {
  const getter = ObjectFunc.getOwnPropertyDescriptor(obj, property)?.get;

  return function (_this: T): ReturnType | undefined {
    if (getter) {
      return ReflectFunc.apply(getter, _this, []) as ReturnType;
    }
  };
}

/** 保存对象某个属性的原始 setter */
export function save_raw_property_setter<T>(obj: T, property: PropertyKey) {
  const setter = ObjectFunc.getOwnPropertyDescriptor(obj, property)?.set;

  return function (_this: T, value: unknown) {
    if (setter) {
      ReflectFunc.apply(setter, _this, [value]);
    }
  };
}

// #endregion

/** 自定义错误信息 */
export class CureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CureError";
  }
}

const random_func = crypto.randomUUID.bind(crypto);

/** 生成 5 位长度的随机字符串 */
export function random_id() {
  return StringFunc.slice(random_func(), 0, 5);
}

export const ElseFunc = create_clean_object(
  {
    /** 创建一个原型链干净的对象 */
    create_clean_object,
    /** 对应 Function 构造函数 */
    Function: Function,
    /** 保存 `Function.prototype.toString` 的原始版本。
     * 用于调用函数真正的 .toString()。
     *
     * 用法为 `.to_raw_string(func)`。
     */
    get_func_string: save_raw_method(Function.prototype.toString),
    /** 保存 `Function.prototype.valueOf` 的原始版本 */
    get_func_value: save_raw_method(Function.prototype.valueOf),
    /** 调用 String 构造函数转为字符串 */
    to_normal_string: String,
    save_raw_method,
    bind: save_raw_method(Function.prototype.bind),

    /** 对应 Blob 构造函数 */
    Blob: Blob,
    /** 对应 URL.createObjectURL */
    create_object_url: URL.createObjectURL,
  },
  true,
);
