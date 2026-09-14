/** 定义用于 Net Request 的类型 */

/** 使用 declarativeNetRequest API 的动态规则、还是会话规则 */
type RuleType = "dynamic" | "session";

/** 匹配网址时使用的 url 格式 */
type PatternType = "url-filter" | "regex-filter";

/** 对一个规则的可执行的操作，对应 declarativeNetRequest 中的规则操作。
 *
 *
 * 当优先级相同时，操作的优先顺序：allow > block > redirect > modifyHeaders
 *
 * https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleAction
 */
type RuleAction = `${chrome.declarativeNetRequest.RuleActionType}`;

/** https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition */
type RuleCondition = {
  domain_type?: `${chrome.declarativeNetRequest.DomainType}`;

  initiator_domains?: string[];
  excluded_initiator_domains?: string[];

  request_domains?: string[];
  excluded_request_domains?: string[];

  request_methods?: `${chrome.declarativeNetRequest.RequestMethod}`[];
  excluded_request_methods?: `${chrome.declarativeNetRequest.RequestMethod}`[];

  resource_types?: `${chrome.declarativeNetRequest.ResourceType}`[];
  excluded_resource_types?: `${chrome.declarativeNetRequest.ResourceType}`[];

  tabIds?: number[];
  excluded_tabIds?: number[];
};

/** 对某个规则执行操作时，需要的额外信息 */
type RuleActionData = {
  /** 匹配的详情信息 —— 即高级匹配信息 */
  condition?: RuleCondition;
  /** 请求头信息 */
  req_headers?: HttpHeader[];
  /** 响应头信息 */
  res_headers?: HttpHeader[];
  /** 重定向的链接 */
  redirect?: string;
};

/** 表是一个重写用的请求头字段 */
type HttpHeader = {
  /** 是否应用该请求头/响应头 */
  on: boolean;
  /** 对请求头的操作咯 */
  operation: `${chrome.declarativeNetRequest.HeaderOperation}`;
  key: string;
  value: string;
};

/** 规则所属的分组，其实就是浏览器调试工具 Network 面板中各种请求类型 */
type RuleGroup =
  | "xhr"
  | "doc"
  | "css"
  | "js"
  | "font"
  | "img"
  | "media"
  | "other";

/** 一个 net request rule 应该具备的东西 */
type BaseRuleData = {
  /** 这是规则在存储、查找时用的 id。它用在很多地方。
   *
   * 和 `ruleId` 是不同的用法，后者只用于 declarativeNetRequest API 啦
   */
  settingId: string;
  /** 是否开启匹配规则。
   *
   * - 开启时在 declarativeNetRequest 中应用规则，
   * - 关闭时在 declarativeNetRequest 中删除规则
   */
  on: boolean;
  /** 匹配优先级，对应 declarativeNetRequest 中的规则优先级 */
  priority: number;
  /** 匹配的规则，即匹配的 URL，支持正则表达式
   *
   * 虽然 declarativeNetRequest API 提供了很多方式的匹配，但为了便于使用，还是正则表达式吧
   */
  pattern: string;
  /** 编写的 pattern 是哪种格式的 */
  pattern_type: PatternType;
  /** 对匹配到的请求执行的操作 */
  action: RuleAction;
  /** 对应操作的详细信息 */
  action_data: RuleActionData;
  /** 该规则的描述信息 */
  desc: string;
  /** 本匹配所属于的分组 */
  group: RuleGroup;
};

/** 存储插件添加的、配置请求头、响应头、响应体、拦截请求等配置信息 */
type OneRuleData = BaseRuleData & {
  /** 对应到插件已保存的 declarativeNetRequest 规则 id，通过它可以找到对应的规则进行删除 */
  ruleId: number | null;
};

/** 在配置了一条规则之后，需要保存到 storage 中。如果规则直接用数组存储，将来查找都很浪费时间。
 * 所以使用对象来存储每一条规则信息，key 就是规则的 `settingId`。
 *
 */
type SavedNetRequestRule = { [settingId: string]: OneRuleData };

type NetRequestEditorTabKey =
  | "condition"
  | "req-http-header"
  | "res-http-header"
  | "redirect";
