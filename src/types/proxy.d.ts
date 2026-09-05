/** 关于浏览器代理的类型 */

/** 代理模式
 *
 * - `direct` = Never use a proxy
 * - `auto_detect` = Auto detect proxy settings
 * - `pac_script` = Use specified PAC script
 * - `fixed_servers` = Manually specify proxy servers
 * - `system` = Use system proxy settings
 *
 * https://developer.chrome.google.cn/docs/extensions/reference/api/proxy?hl=zh-cn#proxy_modes
 */
type ProxyMode =
  | "direct"
  | "auto_detect"
  | "pac_script"
  | "fixed_servers"
  | "system";

/** 表示可代理的协议，对应 ProxyRules 的值 */
type ProxyProtocol = "FALLBACK" | "FTP" | "HTTP" | "HTTPS" | "SINGLE";

/** 代理服务器本身的架构（协议） */
type ProxyServerSchemes = "http" | "https" | "quic" | "socks4" | "socks5";

/** 在表格中展示数据时，表示一行数据 */
type OneProxySettingRow = {
  /** 配置项 id */
  settingId: string;
  /** 配置项的名称 */
  name: string;
  /** 代理模式 */
  mode?: ProxyMode;
  /** 指定使用哪个服务器，是 ProxyServerSetting 的 id */
  server?: string;
  pac_script?: string;
};

/** 记录一个服务器的配置 */
type ProxyServerSetting = {
  /** 配置项 id */
  settingId: string;
  /** 服务器的名称 */
  name: string;
  /** 代理服务器的主机地址 */
  host: string;
  /** 代理服务器的端口 */
  port: string;
  /** 该服务器支持的协议 */
  protocol: ProxyServerSchemes;
};
