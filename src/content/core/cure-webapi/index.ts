import cure from "./cure";
import { expose_name } from "@/shared";
import { anti_debugger_00 } from "./00-anti-debugger";
import { normal_01 } from "./01-normal";
import { freeze_02 } from "./02-freeze";
import { hook_worker_03 } from "./03-worker";
import { hook_document_04 } from "./04-document";

function main() {
  anti_debugger_00();
  normal_01();
  freeze_02();
  hook_worker_03();
  hook_document_04();
}

// 尽可能注入到 globalThis 原型链上！而不是 globalThis 自身哟
const window_proto =
  cure.share.ReflectFunc.getPrototypeOf(globalThis) || globalThis;
// 部分网站会重复注入 hook 代码
// 不过已经通过 vite 插件解决了
// 暴露到全局脚本作用域中
cure.share.ReflectFunc.defineProperty(window_proto, expose_name, {
  value: cure,
  writable: false,
  configurable: false,
  enumerable: false,
});
main();
cure.console.logger.log_after_init();
// 检查是否存在已经注入的配置项哟
const setting = cure.share.ReflectFunc.get(
  globalThis,
  cure.tool.constant.temp_setting_symbol,
);
if (setting) {
  cure.share.ReflectFunc.deleteProperty(
    globalThis,
    cure.tool.constant.temp_setting_symbol,
  );
  cure.tool.msg_handler.init_all_setting(setting);
}
