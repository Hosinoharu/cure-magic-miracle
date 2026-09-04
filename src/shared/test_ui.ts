/** 在开发 UI 界面时并没有真的安装插件，是直接使用 vite dev 进行开发，
 * 这会造成 `chrome API` 无法访问的问题，用以下方案临时解决。
 *
 * 其它主文件导入它即可，但必须最先导入才行哟
 */

// 为了测试逻辑，将所有的 chrome API 置为空对象哟
(function check_chrome() {
  if (chrome.tabs) return;

  function create_proxy(target: object): unknown {
    return new Proxy(target, {
      get() {
        return create_proxy(function () {});
      },
      apply() {
        return create_proxy(function () {});
      },
    });
  }

  // @ts-ignore
  globalThis.chrome = create_proxy({});
  console.warn("调试界面 UI，chrome API 不可用，已使用空对象替代");
})();
