type MyCookie = {
  /** 因为 vue 的特点，所以需要给每个 cookie 新增一个 id 哟 */
  cookieId?: string;
  /** 格式化后的 expires 值，如果为空则表示 `Session cookie` 哟 */
  expires?: string;
  /** 是否折叠内容，不显示 cookie 的详细信息 */
  collapse?: boolean;
} & chrome.cookies.Cookie;
