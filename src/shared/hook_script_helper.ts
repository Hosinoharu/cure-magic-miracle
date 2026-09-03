/** 与 hook 脚本通信 */

import { expose_name } from "./setting";

/** hook 脚本暴露给插件调用的 API 都在这里！ */
const hook_script_msg_handler = `globalThis["${expose_name}"]["tool"]["msg_handler"]`;

/** 生成一个代码便于注入。它生成的代码会调用 hook 脚本暴露的 API */
export function crate_hook_api_code(
  func: HookScriptExposedAPIName,
  arg: string,
) {
  return `${hook_script_msg_handler}["${func}"](${arg})`;
}

/** 注入一个函数执行，并提供参数哟 */
async function inject(
  target: chrome.scripting.InjectionTarget,
  func: NormalFunction,
  ...args: unknown[]
) {
  try {
    return await chrome.scripting.executeScript({
      target,
      func,
      args,
      world: "MAIN",
      injectImmediately: true,
    });
  } catch (e) {
    console.log("[error] Send to hook script error:", e);
  }
}

/** 修改标签页的 cure_settings 配置项，作用到所有 frames */
export async function change_cure_setting(
  tabId: number,
  key: string,
  value: unknown,
) {
  return await call_cure_func(
    { tabId, allFrames: true },
    "change_cure_setting",
    key,
    value,
  );
}

/** 生成一个函数来调用 `cure.tool` 中的某个方法哟。
 *
 * **主要用于 `executeScript API` 进行注入**
 *
 * @param expose_name 暴露到 globalThis 作用域下的名称
 * @param target 要调用的 `cure.tool` 上的某个方法名
 * @param args 要调用的方法的参数
 */
function generate_cure_func(
  expose_name: string,
  target: HookScriptExposedAPIName,
  ...args: unknown[]
) {
  // @ts-ignore
  const t = globalThis[expose_name];
  if (t) {
    t["tool"]["msg_handler"][target](...args);
  }
  // 此时注入的代码还没有执行完成！
  else {
    throw new Error(`[error] call cure func ${target} faild!`);
  }
}

/** 在指定 tabId 上调用 `cure.tool` 上的某个方法 */
export async function call_cure_func(
  target: chrome.scripting.InjectionTarget,
  func_name: HookScriptExposedAPIName,
  ...args: unknown[]
) {
  return await inject(
    target,
    generate_cure_func,
    expose_name,
    func_name,
    ...args,
  );
}
