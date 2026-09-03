# 简单情况

顶层的键值并非是一个对象的情况。

假设现在 chrome storage 的结构如下：

```json
type NICE = {
    A: number
    B: string,
}
```

现在可以**简化顶层键值的读写**：

```ts
// "A" 表示要读写顶层的键 A
// 泛型 NICE 是顶层结构，这样后面可以利用代码提示
// number 是顶层键 A 的值类型
// true 表示持久化存储，即使用 local storage，否则使用 session storage
const var_A = new TopKVManager<NICE, number>("A", true);

await var_A.init(555); // 初始化，只有不存在 A 时才有效
await var_A.set(666); // 设置值
await var_A.get(); // 读取值
await var_A.del(); // 删除键
```

# 复杂情况

顶层的键值是一个对象的情况。

假设现在 chrome storage 的结构如下：

```json
type NICE = {
    A: A_type // A_type 是一个复杂类型
}
```

对于复杂的情况，需要监听变化、缓存加速（异步读写 chrome storage 有小小的延迟）。

```ts
// 泛型 NICE 是顶层结构，这样后面可以利用代码提示
// A_type 是顶层键 A 的值类型
const var_A = new ExTopKVManager<NICE, A_type>(
    "var A", // 日志输出的前缀
    "A",     // "A" 表示要读写顶层的键 A
    { ... }, // 默认值，当删除 A 时，会自动将其设置为该默认值
    true     // 持久化存储
);

var_A.listen();        // 监听值的修改，且更新内部缓存
var_A.stop_listen();   // 不监听值的修改

// 使用默认值进行初始化，如果已经初始化则忽略
await var_A.init();
await var_A.save();     // 保存缓存到 chrome storage
```

# 总结

尽可能简化、统一 chrome storage 的读写，在实践中完善吧。
