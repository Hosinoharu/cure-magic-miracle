/** 统一 Proxy 的配置项读写，以及设置操作 */

import { netproxy_manager } from "@/shared/storage_manager";
import { debounce } from "lodash-es";
import { generate_id, CureLogger } from "@/shared";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, ref, toRaw, watch } from "vue";

netproxy_manager.stop_listen();

const logger = new CureLogger("options/proxy");

/** 读写 Proxy 配置项 */
class ProxyManager {
  static #instance: ProxyManager | undefined;

  /** 当前存储的所有 Proxy 配置项 */
  #all_proxies = ref<OneProxySettingRow[]>([]);
  get all_proxies() {
    return this.#all_proxies;
  }

  /** 当前使用的 proxy 代理配置项的 id */
  #curr_proxy = ref("");
  get curr_proxy() {
    return this.#curr_proxy;
  }

  /** 当前存储的所有 Server 配置项 */
  #all_servers = ref<ProxyServerSetting[]>([]);
  get all_servers() {
    return this.#all_servers;
  }

  /** 当前使用的 proxy 代理配置项的服务器配置项 id */
  #curr_server = computed(() => {
    const id = this.#curr_proxy.value;
    if (!id) return "";

    return this.#all_proxies.value.find(v => v.settingId === id)?.server || "";
  });
  get curr_server() {
    return this.#curr_server;
  }

  private constructor() {}

  static get Instance() {
    if (!this.#instance) {
      this.#instance = new ProxyManager();
    }
    return this.#instance;
  }

  /** 读取 chrome.storage 获取配置项 */
  async init() {
    this.#listen_change();

    if (__IS_DEV_UI__) {
      this.#all_proxies.value = [
        {
          settingId: "proxy-1",
          name: "proxy-name-1",
          mode: "fixed_servers",
        },
        {
          settingId: "proxy-2",
          name: "proxy-name-2",
          mode: "pac_script",
        },
      ];

      this.#all_servers.value = [
        {
          settingId: "server-1",
          name: "mitmproxy",
          host: "localhost",
          port: "8080",
          protocol: "http",
        },
        {
          settingId: "server-2",
          name: "hello",
          host: "127.0.0.1",
          port: "1080",
          protocol: "socks5",
        },
      ];
      return;
    }

    this.#all_proxies.value = await netproxy_manager.get_all_proxies();
    this.#all_servers.value = await netproxy_manager.get_all_servers();
    this.#curr_proxy.value = await netproxy_manager.get_current_proxy();
  }

  /** 监听配置项变化，即时存储到 chrome.storage 中 */
  #listen_change() {
    const debounce_time = 500;

    watch(
      this.#all_proxies,
      debounce(async new_value => {
        new_value = toRaw(new_value);
        logger.log_with_logo("set", "all proxies", new_value);
        if (!__IS_DEV_UI__) {
          await netproxy_manager.set_all_proxies(new_value);
        }
      }, debounce_time),
      { deep: true },
    );

    watch(
      this.#all_servers,
      debounce(async new_value => {
        new_value = toRaw(new_value);
        logger.log_with_logo("set", "all servers", new_value);
        if (!__IS_DEV_UI__) {
          await netproxy_manager.set_all_servers(new_value);
        }
      }, debounce_time),
      { deep: true },
    );
  }

  /** 设置浏览器代理，成功则返回 true */
  async set_browser_proxy(proxyId: string) {
    if (!this.#check_selected_proxy(proxyId)) return false;

    if (__IS_DEV_UI__) {
      this.#curr_proxy.value = proxyId;
      return true;
    }

    let ok = true;
    try {
      await netproxy_manager.set_current_proxy(proxyId);
      const msg = proxyId ? "Set proxy success" : "Cancelled";
      ElMessage.success(msg);
      this.#curr_proxy.value = proxyId;
    } catch (e) {
      const msg = "Error: " + (e as Error).message;
      ElMessageBox.alert(msg, "(*´･д･)? Failed to set proxy", {
        type: "error",
        customStyle: { whiteSpace: "pre-line" },
      });
      ok = false;
    }

    return ok;
  }

  /** 取消浏览器代理 */
  async cancel_browser_proxy() {
    if (!__IS_DEV_UI__) {
      await netproxy_manager.set_current_proxy();
    }
    this.#curr_proxy.value = "";
  }

  /** 在设置一个 proxy 之前需要进行检查
   *
   *  @returns 返回 true 表示可以设置
   */
  #check_selected_proxy(proxyId: string) {
    let msg = "";

    const proxy = this.#all_proxies.value.find(v => v.settingId === proxyId);
    if (!proxy) {
      msg = "不存在该代理配置项";
    } else if (!proxy.mode) {
      msg = "该代理配置项没有设置代理模式";
    } else if (proxy.mode === "fixed_servers") {
      if (!proxy.server) {
        msg = "该代理配置项没有设置代理服务器";
      } else {
        const server = this.#all_servers.value.find(
          v => v.settingId === proxy.server,
        );
        if (!server) {
          msg = "该代理配置项对应的服务器配置项不存在";
        } else if (!server.host || !server.port) {
          msg = "该代理配置项对应的服务器配置项没有设置地址或端口";
        }
      }
    } else if (proxy.mode === "pac_script" && !proxy.pac_script) {
      msg = "该代理配置项没有设置 PAC 脚本";
    }

    msg && ElMessage.warning(msg);
    return msg === "";
  }

  async add_empty_proxy() {
    const p = __IS_DEV_UI__
      ? ({
          settingId: generate_id(),
          name: "",
          mode: "direct",
        } as OneProxySettingRow)
      : await netproxy_manager.add_empty_proxy();

    this.#all_proxies.value.push(p);
  }

  async add_empty_server() {
    const p = __IS_DEV_UI__
      ? ({
          settingId: generate_id(),
          name: "",
          host: "",
          port: "",
          protocol: "http", // 根据文档，这就是默认值
        } as ProxyServerSetting)
      : await netproxy_manager.add_empty_server();

    this.#all_servers.value.push(p);
  }

  async del_proxy(proxyId: string) {
    if (this.#curr_proxy.value === proxyId) {
      throw new Error("Current proxy can't be deleted");
    }

    this.#all_proxies.value = this.#all_proxies.value.filter(
      v => v.settingId !== proxyId,
    );

    if (!__IS_DEV_UI__) {
      await netproxy_manager.set_proxy(proxyId);
    }
  }

  async del_all_proxy() {
    if (!this.#curr_proxy.value) {
      this.#all_proxies.value = [];
      return;
    }

    this.#all_proxies.value = this.#all_proxies.value.filter(
      v => v.settingId === this.#curr_proxy.value,
    );

    if (!__IS_DEV_UI__) {
      throw new Error("Not implemented");
    }
  }

  async del_server(serverId: string) {
    if (this.#curr_server.value === serverId) {
      throw new Error("Current server can't be deleted");
    }

    this.#all_servers.value = this.#all_servers.value.filter(
      v => v.settingId !== serverId,
    );

    if (!__IS_DEV_UI__) {
      await netproxy_manager.set_server(serverId);
    }
  }

  async del_all_server() {
    // 清空现有未使用的 proxy setting 的 server
    this.#all_proxies.value.forEach(v => {
      if (v.settingId !== this.#curr_proxy.value) {
        v.server = "";
      }
    });

    if (!this.#curr_server.value) {
      this.#all_servers.value = [];
      return;
    }

    this.#all_servers.value = this.#all_servers.value.filter(
      v => v.settingId === this.#curr_server.value,
    );

    if (!__IS_DEV_UI__) {
      throw new Error("Not implemented");
    }
  }
}

export default function useProxy() {
  return ProxyManager.Instance;
}
