/** 定义插件的通信协议，即各脚本之间发送什么样的信息 */

/** 发送给 background 的数据体格式！*/
type MsgToBackgroundBoy = {
  type: unknown;
  /** 必须规定消息来自哪里，否则很多地方都在监听消息！必须通过它来区分与处理。
   * 可以在最开始使用 `if (message.from !== 'content') return;` 处理指定的消息！
   */
  from: "content" | "popup" | "option" | "devtool";
  data?: unknown;
};

// #region popup-conn-background PCB
// 定义 popup 脚本与 background 脚本的通信协议，所以 PCB 前缀标识

/** 通信时，信息的种类。
 * - `reload`：表示重新加载插件
 * - `listen-set-cookie`: 监听当前标签页的、响应的 set-cookie 字段
 * - `reset`: 重置插件！
 */
type PCBMsgType = "reload" | "listen-set-cookie" | "reset";

/** 发送消息时的数据体 */
type PCBMsgBody = MsgToBackgroundBoy & {
  type: PCBMsgType;
};

/* 发送 listen-set-cookie 消息时的消息体 */
interface PCBMsgBodyListenSetCookie extends PCBMsgBody {
  type: "listen-set-cookie";
  data: {
    /** 是开启还是关闭监听 */
    on: boolean;
    /** 监听的标签页 id */
    tabId: number;
  };
}

// #endregion

// #region popup-conn-content PCC
// 定义 popup 脚本与 content 脚本的通信协议，所以 PCC 前缀标识

/** 信息的种类
 * - `set-cookie`: 响应头中包含了 `set-cookie` 字段，在控制台进行输出
 */
type PCCMsgType = "set-cookie";

type PCCMsgBody = {
  type: PCCMsgType;
  data?: unknown;
};

/** 发送 set-cookie 消息时的消息体 */
interface PCCMsgBodySetCookie extends PCCMsgBody {
  type: "set-cookie";
  data: {
    /** 访问该链接时，其响应带有 set-cookie 字段 */
    url: string;
    /** 该 set-cookie 字段的值 */
    cookie: string[];
  };
}

//#endregion
