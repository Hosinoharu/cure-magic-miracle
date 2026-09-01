/* eslint-disable @typescript-eslint/no-explicit-any */
import cure_share from "../cure-share/index";
import cure_tool from "../cure-tool/index";
import type { BasicHooker } from "./base";
import { PropertyValueHooker, PropertyHooker } from "./property-hooker";
import { MethodHooker } from "./method-hooker";
import { create_value_hooker } from "./value-hooker";

// #region check and create hooker

/** 判断一个对象是否可以进行 hook，不行直接抛出错误的。否则返回类型信息 */
function _check_obj_can_hook(obj: any, des: string, is_single_obj?: boolean) {
  if (obj === undefined) {
    throw new cure_share.CureError(`Object is undefined: ${des}`);
  }
  if (obj === null) {
    throw new cure_share.CureError(`Object is null: ${des}`);
  }
  // 这说明 obj 是一个单独对象，并且已经被 hook 过了！（即 obj 是一个 Proxy）
  // 那么就不能对它进行二次 hook
  if (is_single_obj) {
    if (cure_tool.proxy_handler.is_cure_proxy(obj)) {
      throw new cure_share.CureError(`Object is already hooked: ${des}`);
    }
  }
  return typeof obj;
}

/** 判断一个对象的属性是否可以进行 hook。
 * - 不行直接抛出错误的，否则返回该属性的类型信息咯。
 * - 如果该属性无法直接访问，如 `Document.prototype.cookie`，则返回空字符串。
 */
function _check_property_can_hook(
  obj: any,
  property: PropertyKey,
  des: string,
) {
  if (!property) {
    throw new cure_share.CureError(`Property is empty: ${des}`);
  }
  _check_obj_can_hook(obj, des);
  // 判断属性是否 hook 过
  if (cure_tool.property_handler.is_hooked_property(obj, property)) {
    throw new cure_share.CureError(`Property is already hooked: ${des}`);
  }
  // 获取现有属性描述符，看看能否可修改
  const configurable = cure_share.ObjectFunc.getOwnPropertyDescriptor(
    obj,
    property,
  )?.configurable;
  // 说明该属性不存在该对象上
  if (configurable === undefined) {
    // 尝试 hook 一个在原型链上的属性：即对象自身没有，但可以访问到该属性
    if (property in obj) {
      throw new cure_share.CureError(
        `Property is not own property, it on prototype: ${des}`,
      );
    }
  } else if (configurable === false) {
    throw new cure_share.CureError(`Property is not configurable: ${des}`);
  }
  let ok = true;
  // 需要先判断属性是否可以访问，如 e.message === "Illegal invocation"
  // 此时先忽略吧
  try {
    obj[property];
  } catch (_) {
    ok = false;
  }
  if (ok && cure_tool.proxy_handler.is_cure_proxy(obj[property])) {
    throw new cure_share.CureError(`Property value is hooker: ${des}`);
  }

  return ok ? typeof obj[property] : "";
}

/** 默认开启 hook 功能 */
export function create_propertyvalue_hooker(
  obj: any,
  property: PropertyKey,
  des: string,
) {
  _check_obj_can_hook(obj, des);
  _check_property_can_hook(obj, property, des);

  obj = cure_tool.proxy_handler.get_raw_obj_from_proxy(obj);
  const t = new PropertyValueHooker(obj, property, des);
  t.hook_it(); // 默认开启功能
  return t;
}

/** 创建 hooker 时进行判断，避免重复 hook、无效的 hook */
function check_target_can_hook(
  obj: any,
  property: PropertyKey,
  des: string,
  is_single_obj = false,
) {
  /** 记录最终要 hook 的对象的类型信息，便于选择最终的 hooker */
  let type_info: string = _check_obj_can_hook(obj, des, is_single_obj);

  obj = cure_tool.proxy_handler.get_raw_obj_from_proxy(obj);
  // 不是单独对象，那么需要判断它的属性是否 hook 过、以及是否可以 hook
  if (!is_single_obj) {
    type_info = _check_property_can_hook(obj, property, des);
  }

  // 根据类型，创建对应的 Hooker
  if (type_info !== "function" && type_info !== "object") {
    throw new cure_share.CureError(
      `[${type_info}] type can't create ObjectHooker, please use PropertyValueHooker or ValueHooker: ${des}`,
    );
  }
  return obj;
}

/** 默认开启 hook 功能 */
export function create_property_hooker(
  obj: any,
  property: PropertyKey,
  des: string,
  is_single_obj = false,
) {
  obj = check_target_can_hook(obj, property, des, is_single_obj);
  const t = new PropertyHooker(obj, property, des, is_single_obj);
  !is_single_obj && t.hook_it(); // 默认开启
  return t;
}

/** 默认开启 hook 功能 */
export function create_method_hooker(
  obj: any,
  property: PropertyKey,
  des: string,
  is_single_obj = false,
) {
  obj = check_target_can_hook(obj, property, des, is_single_obj);
  const t = new MethodHooker(obj, property, des, is_single_obj);
  !is_single_obj && t.hook_it(); // 默认开启
  return t;
}

/** 根据 obj[property] 的类型自动创建对应的 hooker 咯，默认开启 hook 功能 */
export function create_object_hooker(
  obj: any,
  property: PropertyKey,
  des: string,
  is_single_obj = false,
) {
  obj = check_target_can_hook(obj, property, des, is_single_obj);
  const type_info = typeof obj[property];
  let t: ICureHooker | undefined;
  if (type_info === "function") {
    t = new MethodHooker(obj, property, des, is_single_obj);
  }
  if (type_info === "object") {
    t = new PropertyHooker(obj, property, des, is_single_obj);
  }
  !is_single_obj && t?.hook_it(); // 默认开启
  return t;
}

export { create_value_hooker };

// #endregion

/** 记录预先 Hook 的东西 */
export const cure_hooked: {
  [k in string]: BasicHooker | PropertyHooker | MethodHooker;
} = cure_share.ElseFunc.create_clean_object({}, false, "CureHookedTarget");
/** 记录临时 hook 的东西，用于实际过程中在控制台使用 */
export const cure_cache: Record<string, any> =
  cure_share.ElseFunc.create_clean_object({}, false, "CureStorage");
/** 记录插件存储的数据。*/
export const cure_storage: {
  /** 记录下生成时间戳的位置。*/
  time?: ICureStorage;
  /** 记录 blob_url 对应的对象以及生成位置 */
  blob?: ICureStorage;
  /** 记录 Promise.then 中 resolve 函数 */
  promise?: ICureStorage;
  /** 记录 TypedArray 的生成位置 */
  array?: ICureStorage;
} = cure_share.ElseFunc.create_clean_object({}, false, "CureStorage");
