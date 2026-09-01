/** 导出所有 API
 *
 * 经过实践的教训，
 * 现在要做到：**HOOK 时用到的 API 都要保存一份独立的版本，
 * 不要和网站代码共用一份相同的 API，从而避免被检测**。
 */

import {
  StringFunc,
  ArrayFunc,
  ObjectFunc,
  ReflectFunc,
  ElseFunc,
  CureError,
  random_id,
} from "./helper";
import { CureMap } from "./cure-map";
import { CureWeakMap } from "./cure-weakmap";
import { CureSet } from "./cure-set";
import { CureWeakSet } from "./cure-weakset";
import { DateFunc } from "./cure-date";
import { CureXHR, XHRFunc } from "./cure-xhr";
import { CurePromise } from "./cure-promise";
import { EventFunc } from "./cure-event";

/** 输出当前脚本所在全局作用域的名称，可以判断其位于普通全局作用域，还是 Worker 作用域 */
function where_am_i() {
  const name = ReflectFunc.get(globalThis, Symbol.toStringTag);
  let res: HookScope = name;

  switch (name) {
    case "Window":
      res = "Window";
      break;
    case "DedicatedWorkerGlobalScope":
      res = "Worker";
      break;
    case "SharedWorkerGlobalScope":
      res = "SharedWorker";
      break;
    case "ServiceWorkerGlobalScope":
      res = "ServiceWorker";
      break;
    default:
      break;
  }

  return res;
}

/** 获取当前网站的【标识】，在多 iframe 中可以标识不同作用域 */
function get_current_web_tag(scope: HookScope) {
  const id = ` <id=${random_id()}>`;

  if (scope === "Worker") {
    let id = location.pathname;

    // 形如 "blob:http://localhost:8000/c2f1b412-db8f-460a-86c0-a62ae9fce31b"
    // 获取第一个 - 符号前面的数字
    if (location.protocol === "blob:") {
      const href = StringFunc.split(location.href, "/");
      id = StringFunc.split(href[href.length - 1], "-")[0];
    }
    return `${scope} <id=${id}>`;
  }

  if (scope !== "Window") return scope + id;

  if (location.hostname !== "") return location.hostname + id;

  if (location.protocol === "file:") return "local_file" + id;

  const href = location.href;
  if (href.length > 500)
    return StringFunc.substring(href, 0, 20) + ". . ." + id;

  return href + id;
}

const current_cure_scope = where_am_i();

export default ElseFunc.create_clean_object(
  {
    ArrayFunc,
    ObjectFunc,
    StringFunc,
    ReflectFunc,
    DateFunc,
    XHRFunc,
    EventFunc,
    ElseFunc,
    CureError,
    CureMap,
    CureWeakMap,
    CureSet,
    CureWeakSet,
    CurePromise,
    CureXHR,

    /** 当前脚本所在的全局作用域 */
    current_cure_scope,
    /** 当前网站的链接 host 部分，用作唯一标识进行控制台输出 */
    current_cure_url: get_current_web_tag(current_cure_scope),
  },
  true,
  "CureShare",
);
