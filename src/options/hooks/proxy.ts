/** 统一 Proxy 的配置项读写，以及设置操作 */

import { ref, watch, toRaw, computed } from "vue";
import { netproxy_manager } from "@/shared/storage_manager";
import { debounce } from "lodash-es";
import { create_setting_watcher } from "@/shared";
import { ElMessage, ElMessageBox } from "element-plus";

netproxy_manager.stop_listen();

export function useProxy() {
  /** 当前使用的 proxy 代理配置项的 id */
  const curr_proxy = ref("");
  /** 当前使用的 proxy 代理配置项的服务器配置项 id */
  const curr_server = ref("");
  /** 当前使用的 proxy 代理配置项的名称 */
  const curr_proxy_name = computed(() => {
    const proxy = all_proxies.value.find(v => v.settingId === curr_proxy.value);
    return proxy ? proxy.name : "";
  });
  /** 当前存储的所有 Proxy 配置项 */
  const all_proxies = ref<OneProxySettingRow[]>([]);
  /** 当前存储的所有 Server 配置项 */
  const all_servers = ref<ProxyServerSetting[]>([]);

  let initialized = false;
  /** 上一次修改后的 proxy 配置项，用于找出哪些配置项变化了 */
  const last_proxies: { [settingId: string]: string } = {};
  /** 上一次修改后的 server 配置项，用于找出哪些配置项变化了 */
  const last_servers: { [settingId: string]: string } = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let proxy_watcher: undefined | ((new_value: any) => Promise<void>);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let server_watcher: undefined | ((new_value: any) => Promise<void>);

  async function init() {
    if (initialized) return;
    curr_proxy.value = await netproxy_manager.get_current_proxy();
    await update_curr_server();

    const _all_proxies = await netproxy_manager.get_all_proxies();
    for (const proxy of _all_proxies) {
      last_proxies[proxy.settingId] = JSON.stringify(proxy);
    }
    all_proxies.value = _all_proxies;
    proxy_watcher = create_setting_watcher(
      _all_proxies,
      async (settingId, new_value) => {
        const v = new_value ? toRaw(new_value) : new_value;
        await netproxy_manager.set_proxy(settingId, v);
      },
    );

    const _all_servers = await netproxy_manager.get_all_servers();
    for (const server of _all_servers) {
      last_servers[server.settingId] = JSON.stringify(server);
    }
    all_servers.value = _all_servers;
    server_watcher = create_setting_watcher(
      _all_servers,
      async (settingId, new_value) => {
        const v = new_value ? toRaw(new_value) : new_value;
        await netproxy_manager.set_server(settingId, v);
      },
    );

    initialized = true;
  }

  async function watch_proxy_change(new_proxies: OneProxySettingRow[]) {
    if (!initialized) return;
    proxy_watcher && (await proxy_watcher(new_proxies));
  }

  async function watch_server_change(new_servers: ProxyServerSetting[]) {
    if (!initialized) return;
    server_watcher && (await server_watcher(new_servers));
  }

  // #cure-tip 监听变化
  watch(all_proxies, debounce(watch_proxy_change, 1000), { deep: true });
  watch(all_servers, debounce(watch_server_change, 1000), { deep: true });

  async function add_empty_proxy() {
    all_proxies.value.push(await netproxy_manager.add_empty_proxy());
  }

  async function add_empty_server() {
    all_servers.value.push(await netproxy_manager.add_empty_server());
  }

  /** 在设置某个配置项作为浏览器代理时，进行检查
   *  @returns 如何返回空字符串，表示 ok，否则返回的内容作为 warning 进行警告
   */
  async function check_selected_proxy(settingId: string) {
    const proxy = await netproxy_manager.get_proxy(settingId);
    if (!proxy) {
      return "不存在该代理配置项";
    }
    if (!proxy.mode) {
      return "该代理配置项没有设置代理模式";
    }
    if (proxy.mode === "fixed_servers") {
      if (!proxy.server) {
        return "该代理配置项没有设置代理服务器";
      }
      const server = await netproxy_manager.get_server(proxy.server);
      if (!server) {
        return "该代理配置项对应的服务器配置项不存在";
      }
      if (!server.host || !server.port) {
        return "该代理配置项对应的服务器配置项没有设置地址或端口";
      }
    } else if (proxy.mode === "pac_script") {
      if (!proxy.pac_script) {
        return "该代理配置项没有设置 PAC 脚本";
      }
    }
    return "";
  }

  async function set_browser_proxy(settingId?: string) {
    try {
      await update_curr_server();
      await netproxy_manager.set_current_proxy(settingId);
      const msg = settingId ? "Set proxy success" : "Cancelled";
      ElMessage.success(msg);
      curr_proxy.value = settingId || "";
    } catch (e) {
      const msg = "Error: " + (e as Error).message;
      ElMessageBox.alert(msg, "(*´･д･)? Failed to set proxy", {
        type: "error",
        // 使得换行符生效
        customStyle: { whiteSpace: "pre-line" },
      });
    }
  }

  async function update_curr_server() {
    let serverId = "";
    if (curr_proxy.value) {
      const curr_proxy_setting = await netproxy_manager.get_proxy(
        curr_proxy.value,
      );
      if (curr_proxy_setting?.mode === "fixed_servers") {
        serverId = curr_proxy_setting?.server || "";
      }
    }
    curr_server.value = serverId;
  }

  return {
    init,
    curr_proxy,
    curr_server,
    all_proxies,
    all_servers,
    curr_proxy_name,
    add_empty_proxy,
    add_empty_server,
    check_selected_proxy,
    set_browser_proxy,
  };
}
