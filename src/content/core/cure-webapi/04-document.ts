/** hook document 上的一些方法 */

import cure from "./cure";
import { expose_name } from "@/shared";

type InnerWindow = Window & { [expose_name]: typeof cure };

/** 监控 iframe 元素的添加 */
function hook_add_iframe() {
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        // if (node instanceof HTMLScriptElement) {
        //     const text = cure.share.StringFunc.trim(node.textContent);
        //     text &&
        //         cure.console.logger.log_with_group(
        //             "content",
        //             text,
        //             false,
        //             true,
        //             "CureMiracle Add Element Script",
        //             true
        //         );
        //     return;
        // }
        if (node instanceof HTMLIFrameElement) {
          // 整理要输出的内容
          const msg = `\n\tsrc: ${node.src || "about:blank"}\n\tsandbox: ${
            node.sandbox
          }\n\tsrcdoc: ${node.srcdoc}`;
          cure.console.logger.log_with_logo({
            logo: "IFrame",
            data: ["Add Iframe:", msg],
          });
        }
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}

/** 监控 iframe 访问 contentWindow，这是为了解决 iframe 的反 hook 问题 */
function hook_contentWindow() {
  const hooker = cure.create_propertyvalue_hooker(
    HTMLIFrameElement.prototype,
    "contentWindow",
    "HTMLIFrameElement.prototype.contentWindow",
  );
  hooker.init({ getter_setter_no_log: true });
  // 监控 contentWindow 的读写
  // 注意下面是应该调用 iframe 中的 cure 对象，还是当前环境中的 cure 哟
  hooker.set_getter_handler(function (_window: InnerWindow) {
    if (!_window) return _window;
    // 通常是无法访问，即报错：Uncaught SecurityError: Failed to read a named property 'xxx' from 'Window': Blocked a frame
    try {
      _window[expose_name];
    } catch (_) {
      // cure.console.logger.warn(
      //     "iframe no hook",
      //     "it not allowed to access contentWindow "
      // );
      return _window;
    }
    if (_window[expose_name] === undefined) {
      // cure.console.logger.warn("iframe no hook", "it not allowed to run js");
    } else {
      // 先看看初始化完成了没有，当然，如果自己都没初始化，那就算了吧
      if (!cure.tool.msg_handler.initialized()) {
        cure.console.logger.warn(
          "iframe no hook",
          "cause current scope not initialized",
        );
        return _window;
      }

      const initialized = _window[expose_name].tool.msg_handler.initialized();
      if (!initialized) {
        // 此处不能使用 cure.cure_setting 来访问
        // 必须要实时获取最新的配置！
        const setting: AllSetting = cure.share.ElseFunc.create_clean_object({
          cure_setting: (globalThis as unknown as InnerWindow)[expose_name]
            .cure_setting,
          hooker_setting: (globalThis as unknown as InnerWindow)[expose_name]
            .raw_hooker_setting,
        });

        // 这种情况肯定是通过 js 动态创建的 iframe，从而导致配置项没有及时初始化！！！
        // 只好复用当前的配置项，并初始化！
        _window[expose_name].tool.msg_handler.init_all_setting(setting);
        // 输出 iframe 的 hook 状态，以及它的 url
        cure.console.logger.log_with_logo({
          logo: "IFrame",
          data: [
            `the iframe <${_window[expose_name].share.current_cure_url}> initialized by hooker`,
          ],
        });
      }
    }

    // 看情况是否 hook iframe 的 contentWindow
    if (!cure.hooker_setting.iframe_contentWindow_proxy) return _window;
    return cure
      .create_property_hooker(_window, "", "iframe.contentWindow", true)
      .get_hooker();
  });
  cure.hooked["HTMLIFrameElement_p_contentWindow"] = hooker;
  cure.tool.setting_binder.create_setting_switcher({
    target: cure.hooker_setting,
    setting: "HTMLIFrameElement_p_contentWindow",
    enable_func: () => hooker.hook_it(),
    cancel_func: () => hooker.unhook_it(),
    default_value: true,
  });
  // 为 true 则监控 iframe 的 contentWindow 获取了哪些属性
  cure.hooker_setting.iframe_contentWindow_proxy = false;
}

export function hook_document_04() {
  if (cure.share.current_cure_scope !== "Window") return;

  hook_add_iframe();
  hook_contentWindow();
}
