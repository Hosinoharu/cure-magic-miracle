/** hook worker 等 API
 *
 * https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers
 *
 * Worker 在另一个全局上下文中运行，与当前的 window 不同！Window 并不直接在 worker 中可用，
 * 但是它有自己的 `globalThis` 对象！
 *
 * 在最终打包代码时，会将整个 hook 代码包装到一个函数 `CureMiracleMain` 中，那么可以获取该函数的字符串，
 * 然后插入到 worker 中执行，从而达到 `hook worker` 的效果！
 */

import cure from "./cure";
import { BlobStorage } from "../cure-storage";
import { expose_name } from "@/shared";

/*
    重新调整 Hook Worker 的逻辑，具体见 https://github.com/CureMiracleSeries/CureMiracleS1/issues/10
*/
export function hook_worker_03() {
  /** 记录 js 格式的 blob 与其生成的 url 的关系。
   *
   * 这样就可以通过 blob url 获取对应的 blob 对象。这是为了后续在 hook worker 时插入代码做准备哟。
   */
  const js_url_to_blob = new cure.share.CureMap<string, Blob>();
  /** 存储 blob -> raw_obj 的映射关系 */
  const blob_to_obj = new cure.share.CureWeakMap<Blob, BlobToObject>();
  const bloburl_info = new BlobStorage();
  cure.storage.blob = bloburl_info;

  /** 重写的 Blob 构造函数 */
  function blob_construct(
    this: Blob,
    hooked_target: NormalFunction,
    blobParts?: BlobPart[],
    options?: BlobPropertyBag,
  ) {
    const result = cure.share.ReflectFunc.construct(hooked_target, [
      blobParts,
      options,
    ]);
    if (blobParts) {
      const stack =
        cure.tool.stack_handler.curemiracle_get_caller_location(false);
      // 如果不是以字符串内容创建的 blob，则不记录实际的数据 —— 因为内容可能很多
      let obj: BlobPart[] | string = "[CureMiracle: not string, unkown object]";
      if (typeof blobParts[0] === "string") {
        obj = blobParts;
      }
      const t = { params: { blobParts: obj, options }, stack };
      blob_to_obj.set(result, t);
    }
    return result;
  }

  /** 重写的 URL.createObjectURL() */
  function create_object_url(
    this: object,
    hooked_target: NormalFunction,
    obj: Blob,
  ) {
    const result: string = cure.share.ReflectFunc.apply(hooked_target, this, [
      obj,
    ]);

    // 网站没有设置 blob type 类型，不过无妨，能交给 worker 运行的一定是 js 代码啦
    if (
      obj.type === "" ||
      obj.type === "application/javascript" ||
      obj.type === "text/javascript"
    ) {
      js_url_to_blob.set(result, obj);
    }

    // 获取该 blob 对象的底层信息（基于哪个创建的，以及堆栈），然后删除释放空间哟
    const info = blob_to_obj.get(obj);
    if (info) {
      // blob_to_obj.delete(obj);
      bloburl_info.set(result, info);
    }
    // 是其它的情况，则直接记录堆栈信息
    else {
      const stack =
        cure.tool.stack_handler.curemiracle_get_caller_location(false);
      bloburl_info.set(result, {
        params: "[CureMiracle unkown object]",
        stack,
      });
    }
    return result;
  }

  /** 从 worker 构造函数中，需要获取 blob url 原始的 js 文本。
   * 但部分网站不能使用同步请求！所以利用上面建立好的关系来获取原始的 blob 参数！
   *
   * 之后就能直接使用 blob 的原始内容来创建 worker 了！
   *
   * 如果返回 undefined 则表示失败！那么就使用同步请求来访问吧！
   */
  function get_raw_blob_param(blob_url: string) {
    if (cure.share.StringFunc.startsWith(blob_url, "blob:")) {
      const blob = js_url_to_blob.get(blob_url);
      if (blob) {
        const info = blob_to_obj.get(blob);
        if (info && typeof info.params.blobParts !== "string") {
          return info.params.blobParts;
        }
      }
    }
    return undefined;
  }

  /** 插入到 worker 顶部的代码，用于定位到 worker 中 */
  // @ts-ignore
  const light_insert_code = `;console.warn("%c[CureMiracle Worker]", "${cure.console.logger.preset_styles.warn_style}", "starting!");`;

  /** 插入到 worker 顶部的代码，用于 hook worker 内部 */
  // @ts-ignore
  const insert_code = `;(${cure.share.ElseFunc.get_func_string(CureMiracleMain)})();`;
  const split_line = `\n\n/* this is separator line for CureMiracle */\n\n`;

  /** 创建 worker 时，插入 hook 代码，然后再去请求原本的 js 链接，动态执行！ */
  function worker_construct(
    this: Worker,
    hooked_target: NormalFunction,
    url: string,
    options?: WorkerOptions,
  ) {
    /** 将注入到 worker 中执行的代码 */
    const worker_code: string[] = [];

    if (cure.cure_setting.hook_worker) {
      // 使用当前的设置来初始化 worker
      const setting: AllSetting = {
        cure_setting: cure.cure_setting,
        hooker_setting: cure.raw_hooker_setting,
      };
      const setting_src = cure.tool.stringifier.to_string(setting);
      const init_code = `;globalThis.${expose_name}.tool.msg.init_all_setting(${setting_src});`;
      cure.share.ArrayFunc.push(worker_code, insert_code, init_code);
    } else {
      cure.share.ArrayFunc.push(worker_code, light_insert_code);
    }

    // 已经准备好了 hook 代码，需要传入原本的 js 内容
    cure.share.ArrayFunc.push(worker_code, split_line);

    let final_blob_params: BlobPart[] | undefined;
    const raw_blob_params = get_raw_blob_param(url);
    // 没有找到该 url 对应的 blob 参数，则直接使用同步请求来获取
    if (raw_blob_params === undefined) {
      // 传入的可能是 x/y.js 这样的情况，需要拼接成完整的路径
      if (
        !cure.share.StringFunc.startsWith(url, "blob:") &&
        !cure.share.StringFunc.startsWith(url, "http")
      ) {
        url = new URL(url, location.origin).href;
      }
      // 同步请求文件内容并插入，而不是动态执行，因为动态执行无法看到 worker 内部的代码呀！
      const run_code = cure.tool.normal.fetch_sync(url);
      cure.share.ArrayFunc.push(worker_code, run_code);

      final_blob_params = worker_code;
    }
    // 构建全新的 blob 对象
    else {
      final_blob_params = [...worker_code, ...raw_blob_params];
    }

    // 更新了 blob url 哟，插入了代码
    const blob = new cure.share.ElseFunc.Blob(final_blob_params, {
      type: "application/javascript",
    });
    url = cure.share.ElseFunc.create_object_url(blob);
    return cure.share.ReflectFunc.construct(hooked_target, [url, options]);
  }

  // #cure-tip bind-hooker.Blob
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Blob",
    obj: globalThis,
    property: "Blob",
    des: "globalThis.Blob",
    init_obj: { new_handler: blob_construct, call_new_no_log: true },
    default_value: true,
  });

  // #cure-tip bind-hooker.URL_createObjectURL
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "URL_createObjectURL",
    obj: globalThis.URL,
    property: "createObjectURL",
    des: "URL.createObjectURL",
    init_obj: { call_handler: create_object_url, call_new_no_log: true },
    default_value: true,
  });

  // #cure-tip bind-hooker.Worker
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Worker",
    obj: globalThis,
    property: "Worker",
    des: "globalThis.Worker",
    // 重点在于它的参数啦
    init_obj: {
      call_new_param_return_log: true,
      new_handler: worker_construct,
    },
    default_value: true,
  });

  // #cure-tip bind-hooker.Worker_p_postMessage
  cure.tool.setting_binder.create_hooker_switcher({
    setting: "Worker_p_postMessage",
    obj: Worker.prototype,
    property: "postMessage",
    des: "Worker.prototype.postMessage",
    init_obj: { call_param_log: true, call_return_log: false },
    default_value: true,
  });
}
