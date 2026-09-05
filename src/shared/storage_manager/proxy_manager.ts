/** 关于浏览器代理的配置项操作 */
import { ExTopKVManager } from "../storage";
import { generate_id } from "../tools";

/** 设置浏览器代理 */
async function set_browser_proxy(config: chrome.proxy.ProxyConfig) {
  await chrome.proxy.settings.set({
    value: config,
    scope: "regular",
  });
}

export async function clear_browser_proxy() {
  await chrome.proxy.settings.clear({});
}

class NetProxySettingManager
  extends ExTopKVManager<PersistentStorageStructure, NetProxySetting>
  implements NetProxySettingAPI
{
  /** 抽象出来的代码，因为添加代理服务器、添加代理配置项时逻辑几乎相同，仅操作的值不同啦，所以进行整理。
   * @param target 操作的是服务器还是代理配置项
   * @param name 服务器名称或者代理配置项名称
   * @param value 服务器配置项或者代理配置项
   */
  async #set_item(
    target: "server" | "proxy",
    settingId: string,
    value?: OneProxySettingRow,
  ): Promise<void> {
    await this.init();
    let changed = false;
    if (value) {
      changed = true;
      this.temp[target][settingId] = value;
      this.logger.log_with_logo("set", "set " + target, value);
    } else {
      const res = this.temp[target][settingId];
      if (res) {
        changed = true;
        delete this.temp[target][settingId];
        this.logger.log_with_logo("set", "delete " + target, res);
      }
    }

    changed && (await this.save());
  }

  async add_empty_server(): Promise<ProxyServerSetting> {
    await this.init();
    const id = generate_id();
    const res: ProxyServerSetting = {
      settingId: id,
      name: "",
      host: "",
      port: "",
      protocol: "http",
    };
    this.temp.server[id] = res;
    await this.save();
    return res;
  }

  async set_server(
    settingId: string,
    server?: ProxyServerSetting,
  ): Promise<void> {
    return await this.#set_item("server", settingId, server);
  }

  async get_server(settingId: string): Promise<ProxyServerSetting | undefined> {
    await this.init();
    return this.temp.server[settingId];
  }

  async get_all_servers(): Promise<ProxyServerSetting[]> {
    await this.init();
    const res = Object.values(this.temp.server);
    if (res.length === 0) {
      const t = await this.add_empty_server();
      res.push(t);
    }
    return res;
  }

  async add_empty_proxy(): Promise<OneProxySettingRow> {
    await this.init();
    const id = generate_id();
    const res: OneProxySettingRow = {
      settingId: id,
      name: "",
      mode: "direct",
      server: "",
    };
    this.temp.proxy[id] = res;
    await this.save();
    return res;
  }

  async set_proxy(
    settingId: string,
    proxy?: OneProxySettingRow,
  ): Promise<void> {
    return await this.#set_item("proxy", settingId, proxy);
  }

  async get_proxy(settingId: string): Promise<OneProxySettingRow | undefined> {
    await this.init();
    return this.temp.proxy[settingId];
  }

  async get_all_proxies(): Promise<OneProxySettingRow[]> {
    await this.init();
    const res = Object.values(this.temp.proxy);
    if (res.length === 0) {
      const t = await this.add_empty_proxy();
      res.push(t);
    }
    return res;
  }

  async set_current_proxy(settingId?: string): Promise<void> {
    await this.init();
    if (settingId) {
      this.temp.current_proxy = settingId;
      this.logger.log_with_logo(
        "set",
        "set current proxy",
        "proxy id:",
        settingId,
      );
    } else {
      this.temp.current_proxy = "";
      this.logger.log_with_logo("del", "cancel proxy");
    }
    await this.#set_browser_proxy(settingId);
    await this.save();
  }

  async get_current_proxy(): Promise<string> {
    await this.init();
    return this.temp.current_proxy || "";
  }

  /** 传入一个代理配置项的 id，将其设置成浏览器的代理。如果传入 undefined，则是取消当前代理 */
  async #set_browser_proxy(settingId?: string) {
    if (settingId === undefined) {
      await clear_browser_proxy();
      return;
    }

    await this.init();
    // 在调用本方法之前已经进行过校验了
    const proxy = (await this.get_proxy(settingId))!;
    const server = (await this.get_server(proxy.server!))!;

    const config: chrome.proxy.ProxyConfig = {
      mode: proxy.mode!,
    };

    const proxy_mode = proxy.mode;
    switch (proxy_mode) {
      // 在 system 模式下，代理配置从操作系统中获取。此模式不允许 在 ProxyConfig 对象中包含更多参数。
      case "system":
        break;
      // 在 direct 模式下，所有连接都是直接创建，不涉及任何代理。此模式允许 ProxyConfig 对象中没有其他参数。
      // 简单直接，直接不使用代理好了
      case "direct":
        clear_browser_proxy();
        return;
      // 手动配置代理
      case "fixed_servers":
        config.rules = {
          singleProxy: {
            host: server.host,
            port: parseInt(server.port),
            scheme: server.protocol || "http",
          },
        };
        break;
      // 可以从网站获取，但是没必要
      case "pac_script":
        config.pacScript = {
          data: proxy.pac_script,
        };
        break;
      default:
        break;
    }

    await set_browser_proxy(config);
    this.logger.log_with_logo(
      "set",
      "set browser proxy",
      "ProxyConfig:",
      config,
    );
  }
}

const default_setting: NetProxySetting = {
  server: {},
  proxy: {},
  current_proxy: "",
};
// 不需要监听变化！因为只有一个地方访问了它！
export const netproxy_manager = new NetProxySettingManager(
  "net proxy",
  "NetProxy",
  default_setting,
  true,
);
