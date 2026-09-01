`core` 目录是最核心的 `Hook` 代码：

- `cure-share`: 保存用到的 WebAPI
- `cure-storage`: 在 hook 时存储数据
- `cure-setting`: 配置项
- `cure-console`: 用于控制台输出、以及一些 API
- `cure-tool`: 工具函数等
- `cure-core`: 最核心的 hook 代码
- `cure-webapi`: hook 常用的 webapi

代码原则：**和网站隔离 API**，即保存一份用到的 Web API，不和网站混用。

本部分的代码是与浏览器插件相隔离的，它提供了一些暴露到全局作用域的 API，插件可以通过**注入代码来调用暴露的 API 进行控制**。
