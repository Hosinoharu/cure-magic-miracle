/** 读写 chrome.storage，为 Rpc Server ui 提供数据。
 *
 * 当开启 dev mode 时，则使用为测试 ui 而准备的 fake data
 */

import { generate_id, CureLogger } from "@/shared";
import {
  dynamic_rule_manager,
  session_rule_manager,
} from "@/shared/storage_manager";
import { ElMessage, ElMessageBox } from "element-plus";
import { ref, watch } from "vue";

dynamic_rule_manager.stop_listen();
session_rule_manager.stop_listen();

const logger = new CureLogger("options/net-request");

export class NetRequestManager {
  static #instance: NetRequestManager | null = null;

  public readonly curr_rule_mode = ref<RuleMode>("dynamic");
  #all_rules: BaseRuleData[] = [];
  public readonly curr_rules = ref<BaseRuleData[]>([]);
  #search_text = "";

  private constructor() {}

  static get Instance() {
    if (!this.#instance) {
      this.#instance = new NetRequestManager();
    }
    return this.#instance;
  }

  get #rule_manager() {
    return this.curr_rule_mode.value === "dynamic"
      ? dynamic_rule_manager
      : session_rule_manager;
  }

  async init() {
    await this.#update_rules();
    watch(this.curr_rule_mode, async () => await this.#update_rules());
  }

  async #update_rules() {
    if (__IS_DEV_UI__) {
      const domains = [
        "example.com",
        "hello.com",
        "world.com",
        "nice.com",
        "wuhu.com",
      ];

      const groups: RuleGroup[] = [
        "xhr",
        "doc",
        "css",
        "js",
        "font",
        "img",
        "media",
        "other",
      ];

      const res: BaseRuleData[] = [];
      for (const d of domains) {
        for (let i = 1; i < 2; i++) {
          res.push({
            settingId: generate_id(),
            on: Math.random() > 0.5,
            priority: i,
            pattern: d + ` - ${i}`,
            pattern_type: "regex-filter",
            action: "modifyHeaders",
            action_data: {
              req_headers: [],
              res_headers: [],
            },
            desc: `${d} - desc - ${i}`,
            group: groups[Math.floor(Math.random() * groups.length)]!,
          });
        }
      }

      this.#all_rules = res;
      this.curr_rules.value = res;
      return;
    }

    const rules = await this.#rule_manager.get_all_rules();
    this.#all_rules = Object.values(rules).map(rule => rule.data);
    this.update_current_rules_with_search(this.#search_text);
  }

  /** 根据描述信息过滤 current rules */
  update_current_rules_with_search(text: string) {
    this.#search_text = text;
    if (text === "") {
      this.curr_rules.value = this.#all_rules;
    } else {
      this.curr_rules.value = this.#all_rules.filter(rule => {
        return rule.desc.toLowerCase().includes(text.toLowerCase());
      });
    }
  }

  async add_empty_rule() {
    let item: BaseRuleData;

    if (__IS_DEV_UI__) {
      item = {
        settingId: generate_id(),
        on: false,
        priority: 1,
        pattern: "",
        pattern_type: "regex-filter",
        action: "allowAllRequests",
        action_data: {},
        desc: "",
        group: "other",
      };
    } else {
      item = await this.#rule_manager.add_empty_rule();
    }

    this.curr_rules.value.push(item);
    // 这说明，all_rules 和 curr_rules 是不同的数据，需要额外更新
    if (this.#search_text) {
      this.#all_rules.push(item);
    }
  }

  /** 保存 rule 到 storage 中 */
  async save_rule(rule: BaseRuleData) {
    if (rule.on && !rule.pattern.trim()) {
      ElMessage.warning({
        message: "Rule pattern can not be empty when ON",
        grouping: true,
      });
      return;
    }

    try {
      new RegExp(rule.pattern);
    } catch {
      ElMessage.warning({
        message: "Rule pattern is not a valid regex",
        grouping: true,
      });
      return;
    }

    if (__IS_DEV_UI__) {
      logger.log_with_logo("set", "rule", rule);
    } else {
      try {
        this.#rule_manager.add_rule(rule);
      } catch (e) {
        const msg = "Error: " + (e as Error).message;
        ElMessageBox.alert(msg, "(*´･д･)? Failed to save rule", {
          type: "error",
          customStyle: { whiteSpace: "pre-line" },
        });
        return;
      }
    }

    ElMessage.success({
      message: "save rule success!",
      grouping: true,
    });
  }

  /** 复制一个 rule，但默认不开启功能，同时保存到 storage 中 */
  async copy_rule(rule: BaseRuleData) {
    const item = structuredClone(rule);
    item.settingId = generate_id();
    item.desc = "[copy] " + item.desc;
    item.on = false;

    if (!__IS_DEV_UI__) {
      await this.#rule_manager.add_rule(item);
    }

    const index = this.curr_rules.value.findIndex(
      one => one.settingId === rule.settingId,
    );
    this.curr_rules.value.splice(index + 1, 0, item);
    // 这说明，all_rules 和 curr_rules 是不同的数据，需要额外更新
    if (this.#search_text) {
      const index = this.#all_rules.findIndex(
        one => one.settingId === rule.settingId,
      );
      this.#all_rules.splice(index + 1, 0, item);
    }
  }

  /** 删除 rules，同时更新 storage */
  async delete_rules(rules: BaseRuleData[], clear_curr_rules = false) {
    if (!__IS_DEV_UI__) {
      const ids = rules.map(rule => rule.settingId);
      await this.#rule_manager.del_rules(ids);
    }

    this.#all_rules = this.#all_rules.filter(rule => {
      return !rules.some(one => one.settingId === rule.settingId);
    });

    if (clear_curr_rules) {
      this.curr_rules.value = [];
    } else {
      this.update_current_rules_with_search(this.#search_text);
    }
  }

  async delete_all_rules() {
    if (!__IS_DEV_UI__) {
      await this.#rule_manager.del_all_rules();
    }

    this.curr_rules.value = this.#all_rules = [];
  }
}

export default function use_net_request_manager() {
  return NetRequestManager.Instance;
}
