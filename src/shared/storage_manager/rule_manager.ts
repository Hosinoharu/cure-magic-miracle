/** 统一处理通过 declarativeNetRequest API 添加的规则，同时保存到 storage 中
 *
 * 此处仅处理动态\会话规则哟。
 */
import { generate_id } from "../tools";
import { ExTopKVManager } from "../storage";

/** 设置为 true 之后，将不会实际添加规则到 declarativeNetRequest，仅测试 ui 和 storage 的工作是否正常 */
const debug_ui = false;

/** 输出现有的所有的规则，便于调试用的 */
export async function show_all_rules() {
  const dynamic_rules = await chrome.declarativeNetRequest.getDynamicRules();
  if (dynamic_rules.length > 0) {
    console.log("[rule manager] All Dynamic Rules:", dynamic_rules);
  }

  const session_rules = await chrome.declarativeNetRequest.getSessionRules();
  if (session_rules.length > 0) {
    console.log("[rule manager] All Session Rules:", session_rules);
  }
}

/**
 * 一定要分清楚两个【规则】的含义：
 * 1. declarativeNetRequest API 中的规则，这是要实际配置的。我并没有保存这种规则，毕竟它们可以直接通过 API 获取
 * 2. storage 中的规则，这是保存的规则，用户配置这些规则后，会先保存起来，
 * 再根据是否应用这个规则再调用 declarativeNetRequest API 去添加规则。
 *
 *
 * **当修改 storage 中的规则时，如果已经在 declarativeNetRequest 中启用了该规则，会进行更新的哟~~**
 */
class NetRequestRuleManager
  extends ExTopKVManager<PersistentStorageStructure, SavedNetRules>
  implements NetRequstRuleAPI
{
  /** 记录当前最大的、可用于 declarativeNetRequest 规则的 id。
   *
   * 在初始化时，获取所有保存的规则中【最大的 rule_id 值 + 1】作为本值咯。
   */
  #curr_ruleId: number = 1;
  #ruleId_init = false;

  async init_curr_ruleId() {
    if (this.#ruleId_init) return;

    await this.init();
    const rules = Object.values(this.temp);
    // 如果当前没有任何，添加一行空数据，这是为了在 ui 展示时可以有一个【模板】
    if (rules.length === 0) {
      this.#gen_empty_rule();
      await this.save();
    }
    // 否则，获取最大的 rule_id 值
    else {
      this.#curr_ruleId = Math.max(...rules.map(rule => rule.ruleId || 0)) + 1;
      this.logger.log_with_logo(
        "init",
        `init ${this.#type} rule, curr_ruleId=${this.#curr_ruleId}`,
      );
    }

    this.#ruleId_init = true;
  }

  /** 标记当前操作的是动态规则还是会话规则 */
  get #type() {
    return this.name === "NetRequestRule" ? "dynamic" : "session";
  }

  /** 添加新的、用于 declarativeNetRequest 的规则时需要一个 id 嘛，用该方法生成 */
  #gen_ruleId() {
    return this.#curr_ruleId++;
  }

  // #region 读写 declarativeNetRequest Rules

  /** 删除多条条规则
   *
   * @param type 'dynamic' 表示动态规则，'session' 表示会话规则
   * @param ruleIds 规则的 id
   */
  async #delete_declarative_rule(type: RuleMode, ruleIds: number[]) {
    if (debug_ui) return;

    if (type === "dynamic") {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
      });
    } else {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: ruleIds,
      });
    }
  }

  async #delete_all_declarative_rules(type: RuleMode) {
    if (debug_ui) return;

    if (type === "dynamic") {
      const removeRuleIds = (
        await chrome.declarativeNetRequest.getDynamicRules()
      ).map(rule => rule.id);
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
    } else {
      const removeRuleIds = (
        await chrome.declarativeNetRequest.getSessionRules()
      ).map(rule => rule.id);
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds });
    }
  }

  /** 添加一条规则。如果已经有 ruleId 相同的规则，会先删除再添加
   *
   * @param type 'dynamic' 表示动态规则，'session' 表示会话规则
   * @param rule 规则
   * @param ruleId 规则的 id —— 仅添加规则的时候才有该参数哟
   */
  async #add_declarative_rule(type: RuleMode, rule: OneNetRule) {
    if (rule.ruleId === undefined) {
      throw new Error("Add rule, but no rule_id is specified!");
    }

    const the_rule = this.#convert_declarative_rule(type, rule);
    this.logger.log_with_logo(
      "set",
      `add ${type} rule`,
      JSON.stringify(the_rule, null, 2),
    );

    if (debug_ui) return;

    if (type === "dynamic") {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [the_rule],
        removeRuleIds: [rule.ruleId],
      });
    } else {
      await chrome.declarativeNetRequest.updateSessionRules({
        addRules: [the_rule],
        removeRuleIds: [rule.ruleId],
      });
    }
  }

  /** 将保存的规则解析为对应的 declarativeNetRequest 规则 */
  #convert_declarative_rule(type: RuleMode, rule: OneNetRule) {
    const action_type = rule.data.action;

    const action: chrome.declarativeNetRequest.RuleAction = {
      type: action_type,
    };

    if (action_type === "modifyHeaders") {
      const req_headers = rule.data.action_data.req_headers;
      const res_headers = rule.data.action_data.res_headers;

      if (req_headers) {
        action.requestHeaders = this.#parse_http_header(req_headers);
      }
      if (res_headers) {
        action.responseHeaders = this.#parse_http_header(res_headers);
      }
    } else if (action_type === "redirect") {
      const redirect = rule.data.action_data.redirect;
      if (redirect) {
        action.redirect = { url: redirect };
      }
    }

    const res: chrome.declarativeNetRequest.Rule = {
      id: rule.ruleId!,
      priority: rule.data.priority,
      action,
      condition: this.#parse_declarative_rule_condition(type, rule),
    };

    return res;
  }

  /** 生成 RuleCondition。
   *
   * https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition
   */
  #parse_declarative_rule_condition(type: RuleMode, rule: OneNetRule) {
    const res: chrome.declarativeNetRequest.RuleCondition = {
      // #cure-warn 当前只支持 regexFilter
      regexFilter: rule.data.pattern,
    };
    // 它的一些属性不能是空列表，所以只能不断判断进行添加
    const detail = rule.data.action_data.condition || {};

    // 标签页的过滤仅在 session 模式下可用
    if (type === "session") {
      if (detail.tabIds && detail.tabIds.length > 0) {
        res.tabIds = detail.tabIds;
      }
      if (detail.excluded_tabIds && detail.excluded_tabIds.length > 0) {
        res.excludedTabIds = detail.excluded_tabIds;
      }
    }

    if (detail.initiator_domains && detail.initiator_domains.length > 0) {
      res.initiatorDomains = detail.initiator_domains;
    }

    if (
      detail.excluded_initiator_domains &&
      detail.excluded_initiator_domains.length > 0
    ) {
      res.excludedInitiatorDomains = detail.excluded_initiator_domains;
    }

    if (detail.request_domains && detail.request_domains.length > 0) {
      res.requestDomains = detail.request_domains;
    }

    if (
      detail.excluded_request_domains &&
      detail.excluded_request_domains.length > 0
    ) {
      res.excludedRequestDomains = detail.excluded_request_domains;
    }

    // 二者只能存在一个，都不存在则匹配所有方法
    if (detail.request_methods && detail.request_methods.length > 0) {
      res.requestMethods =
        detail.request_methods as chrome.declarativeNetRequest.RequestMethod[];
    } else if (
      detail.excluded_request_methods &&
      detail.excluded_request_methods.length > 0
    ) {
      res.excludedRequestMethods =
        detail.excluded_request_methods as chrome.declarativeNetRequest.RequestMethod[];
    }

    // 二者只能存在一个，但我要保证默认情况下匹配所有资源类型哟
    if (detail.resource_types && detail.resource_types.length > 0) {
      res.resourceTypes =
        detail.resource_types as chrome.declarativeNetRequest.ResourceType[];
    } else if (
      detail.excluded_resource_types &&
      detail.excluded_resource_types.length > 0
    ) {
      res.excludedResourceTypes =
        detail.excluded_resource_types as chrome.declarativeNetRequest.ResourceType[];
    } else {
      res.resourceTypes = Object.values(
        chrome.declarativeNetRequest.ResourceType,
      );
    }

    return res;
  }

  /** 解析保存的规则中的请求头，生成用于 declarativeNetRequest 的请求头规则 */
  #parse_http_header(headers: HttpHeader[]) {
    const req_headers: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [];
    for (const header of headers) {
      if (!header.on) continue;

      const key = header.key.trim();
      if (!key) continue;

      req_headers.push({
        header: key,
        operation: header.operation,
        value: header.value.trim(),
      });
    }

    return req_headers.length > 0 ? req_headers : undefined;
  }

  // #endregion

  // #region 读写 storage 中保存的 rule

  async add_rule(data: BaseRuleData) {
    await this.init_curr_ruleId();
    const raw_rule = this.temp[data.settingId];
    this.temp[data.settingId] = { data };
    const rule = this.temp[data.settingId]!;

    // 因为可能覆盖配置项，所以额外处理。如果原来的规则已经被应用，需要先删除
    if (raw_rule?.ruleId) {
      await this.#delete_declarative_rule(this.#type, [raw_rule.ruleId]);
      delete raw_rule.ruleId;
    }

    // 新增的规则需要被应用到 declarativeNetRequest 中
    if (rule.data.on) {
      rule.ruleId = rule.ruleId || this.#gen_ruleId();
      this.logger.log_with_logo(
        "set",
        "add rule in declarativeNetRequest",
        JSON.stringify(rule, null, 2),
      );
      await this.#add_declarative_rule(this.#type, rule);
    }

    await this.save();
  }

  async del_rules(settingIds: string[]): Promise<void> {
    await this.init_curr_ruleId();
    const ids = [];
    for (const settingId of settingIds) {
      const rule = this.temp[settingId];
      const ruleId = rule?.ruleId;
      if (ruleId) {
        ids.push(ruleId);
        this.logger.log_with_logo("del", "rule", rule);
      }
      delete this.temp[settingId];
    }

    if (ids.length > 0) {
      await this.#delete_declarative_rule(this.#type, ids);
    }

    await this.save();
  }

  async del_all_rules() {
    await this.init_curr_ruleId();
    this.logger.log_with_logo("del", "clear all rules in storage");
    // 先要清空 declarativeNetRequest 中的规则
    await this.#delete_all_declarative_rules(this.#type);
    this.temp = this.copy_default_setting();
    await this.save();
  }

  /** 生成默认的一条规则，并且保存到了 temp 中哟，返回对应的 settingId */
  #gen_empty_rule(settingId?: string) {
    settingId = settingId || generate_id();
    const data: BaseRuleData = {
      settingId,
      on: false,
      priority: 1,
      pattern: "",
      pattern_type: "regex-filter",
      action: "allowAllRequests",
      action_data: {},
      desc: "empty rule",
      group: "other",
    };
    this.temp[settingId] = { data: data };
    return settingId;
  }

  async add_empty_rule() {
    await this.init_curr_ruleId();
    const settingId = this.#gen_empty_rule();
    await this.save();
    // 注意返回副本
    return structuredClone(this.temp[settingId]!.data);
  }

  async get_all_rules() {
    await this.init_curr_ruleId();
    return structuredClone(this.temp);
  }

  // #endregion
}

/** 操作动态规则 */
export const dynamic_rule_manager = new NetRequestRuleManager(
  "dynamic rule",
  "NetRequestRule",
  {},
  true,
).listen();
/** 操作会话规则 */
export const session_rule_manager = new NetRequestRuleManager(
  "session rule",
  "SessionNetRequestRule",
  {},
  true,
).listen();
