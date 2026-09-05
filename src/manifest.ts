/** manifest.json 文件的内容
 *
 * 其中的路径就和当前开发路径一致，打包后会保持路径不变啦。
 *
 * 静态资源使用【插件根目录的路径】
 */
const manifest: Browser.runtime.ManifestV3 = {
  name: "Cure Magic Miracle",
  short_name: "Cure Miracle",
  version: "this value should read from package.json",
  description: "this value should read from package.json",
  homepage_url: "this value should read from package.json",
  manifest_version: 3,
  minimum_chrome_version: "120",
  icons: {
    128: "static/icon-128.png",
  },
  action: {
    default_popup: "./popup/index.html",
    default_icon: "static/icon-128.png",
  },
  background: {
    service_worker: "./background/index.js",
    type: "module",
  },
  side_panel: {
    default_path: "./side_panel/index.html",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["./content/main.js"],
      world: "MAIN",
      run_at: "document_start",
      all_frames: true,
      match_about_blank: true,
      match_origin_as_fallback: true,
    },
    {
      matches: ["<all_urls>"],
      js: ["./content/isolated.js"],
      run_at: "document_start",
      all_frames: true,
      match_about_blank: true,
      match_origin_as_fallback: true,
    },
  ],
  permissions: [
    "tabs",
    "storage",
    "scripting",
    "webNavigation",
    "webRequest",
    "userScripts",
    "sidePanel",
    "cookies",
  ],
  host_permissions: ["<all_urls>"],
  web_accessible_resources: [
    {
      resources: ["static/curedebug.txt"],
      matches: ["<all_urls>"],
    },
  ],
};

export function get_manifest(target: "chrome" | "firefox") {
  if (target !== "chrome" && target !== "firefox") {
    throw new Error("browser target is invalid: " + target);
  }

  return manifest;
}
