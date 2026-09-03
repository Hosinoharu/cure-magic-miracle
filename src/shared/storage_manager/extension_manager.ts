/** 操作插件自身配置项 */
import { ExTopKVManager } from "../storage";

/** 抽象化所有关于插件自身的配置项操作 */
class ExtensionSettingManager
  extends ExTopKVManager<PersistentStorageStructure, ExtensionSetting>
  implements ExtensionSettingAPI
{
  async get_setting<K extends keyof ExtensionSetting>(
    key: K,
  ): Promise<ExtensionSetting[K]> {
    await this.init();
    const res = this.temp[key] || this.default_setting[key];
    this.logger.log_with_logo("get", `setting`, key, "==>", res);
    return res;
  }

  async set_setting<K extends keyof ExtensionSetting>(
    key: K,
    value: ExtensionSetting[K] | undefined,
  ) {
    await this.init();
    if (value) {
      this.temp[key] = value;
    } else {
      delete this.temp[key];
    }
    this.logger.log_with_logo("set", `setting`, key, "==>", value);
    await this.save();
  }

  async get_all_settings() {
    await this.init();
    return this.temp;
  }
}

const default_setting: ExtensionSetting = {
  dev_mode: false,
};
/** 操作插件自身配置项 */
export const extension_setting = new ExtensionSettingManager(
  "extension setting",
  "Extension",
  default_setting,
  true,
).listen();
