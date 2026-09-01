/** 保存 xhr 等请求 API */

import {
  create_clean_object,
  save_raw_method,
  save_raw_property_getter,
  ElseFunc,
} from "./helper";

const raw_XHR = XMLHttpRequest;
const raw_open = save_raw_method(XMLHttpRequest.prototype.open);
const raw_send = save_raw_method(XMLHttpRequest.prototype.send);
const raw_responseText = save_raw_property_getter<XMLHttpRequest, string>(
  XMLHttpRequest.prototype,
  "responseText",
);

/** 保存的 XHR API */
export const XHRFunc = create_clean_object(
  {
    /** 对应原始的 fetch API 啦，需要绑定到全局对象啦！ */
    fetch: ElseFunc.bind(fetch, globalThis),
  },
  true,
);

/** 封装 XHR API */
export class CureXHR {
  #xhr: XMLHttpRequest;

  get responseText() {
    return raw_responseText(this.#xhr) as string;
  }

  constructor() {
    this.#xhr = new raw_XHR();
  }

  open(method: string, url: string, async = true) {
    raw_open(this.#xhr, method, url, async, undefined, undefined);
  }

  send(body?: Document | XMLHttpRequestBodyInit | null | undefined) {
    raw_send(this.#xhr, body);
  }

  get [Symbol.toStringTag]() {
    return "CureXHR";
  }
}
