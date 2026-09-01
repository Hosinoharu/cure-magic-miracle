记录 `hook` 代码的注入。

# 最快注入

使用插件的 `content script、chrome.userScripts、chrome.scripting.executeScript` 都能注入 JS 到网页中。

它们的确可以尽可能快的注入 —— 除非不访问 `chrome.storage` 读取配置项。**一旦读取了配置项（异步操作），微小的延迟就失去了最快注入的机会**。

`chrome.scripting、chrome.userScripts` 也不行！文档有描述：

>   如果设置了 `injectImmediately` 属性，即使网页尚未完成加载，脚本也会立即注入。如果脚本的计算结果为 promise，浏览器将等待 promise 确定，并返回结果值。
>
>   `injectImmediately` 参数**并不能保证在网页加载之前进行注入，因为当脚本到达目标时，网页可能已经加载完毕**。
>
>   没错！它们的确能**最快开始注入**，但真正进行注入的时候可能已经晚了。
>
>   所以它们都不行！

以下是实践过程中总结的顺序：

-   任何 `register` 注册脚本的方案都比直接在 `manifest.json` 写入 `content script` 慢！ —— `content-script` > `register`
-   在 `tab on updated`、``web navigation on committed` 事件注入脚本都比 `content-script` 快。同时 `tab update` > `on commit` > `content-script`，但 `tab update` 不能注入到 `iframe` 中
-   `content-script` 在注入到 `iframe` 中最快！

# 最终注入方案

普通情况下可以使用多重注入，在脚本中加入判断可以避免重复注入！

-   通过 `tabs.onUpdated` 监听标签页刷新，在 `loading` 状态下，注入 hook 代码 —— 在普通的 `html` 网页中它最快！
-   使用 `content-script` 注入，它注入到 `iframe` 中最快

那怎么最快注入配置项呢？没办法！微小的延迟都不行！

**所以插件读取现有配置项并进行缓存！从而加快读取速度**！

-   注入代码的时候使用 `chrome.userScripts`，因为它可以批量注入，应该比分两次注入更快
-   同时也要注入配置项到 `iframe` 中，所以总共是三重注入！：`content-script、tab updated、web navigation on commited`！！
-   当开启 `hook Worker` 时，利用插件重写响应，从而插入 `hook` 代码 —— 该方案暂时不使用。