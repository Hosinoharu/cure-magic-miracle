这里记录 `hook` 的设计。

# 总览

首先，hook 的目标有不同情况：

1.   [针对属性的值](#Hook 属性的值) —— hook `obj.x` 这个属性的值，从而**监听该属性的值的读写**，通常是该属性值为非对象时使用。比如初始情况下 `obj.x = 2`，使用 hook 后：
     -   `obj.x` 读取该属性的值时，能监听到
     -   `obj.x.a` 会读取该属性的值，所以能监听到，但*不能监听到这个属性自身访问了 `.a`*
     -   `obj.x = 3` 写入该属性的值时，能监听到
2.   [针对属性自身](#Hook 属性自身) —— hook `obj.x` 该属性自身，从而**监听该属性自身的读写**，通常是该属性值为对象时使用。比如初始情况下 `obj.x = { a: 2 }`，使用 hook 后：
     -   `obj.x` 读取该属性的值时，**不能**监听到
     -   `obj.x.a` **不能**监听到访问了该属性，但*能监听到这个属性自身访问了 `.a`*
     -   `obj.x = 3` 写入该属性的值时，**不能**监听到
3.   [针对函数调用](#调用函数) —— 当监听属性自身且为对象时，有个特殊的情况是函数，区别就在于函数可调用。比如初始情况下 `obj.func = () => {}`，使用 hook 后：
     -   `obj.func` 遵守上面 1、2 两种情况，因为它本身也是一个属性，但这不是重点
     -   `obj.func(1, 2)` 调用函数时，能监听到

其次，**在读写属性时实际读写的是属性描述符**，后续的操作都是基于它，比如会调用 `Object.defineProperty` 来重写其属性描述符。它也分为两种情况：是否具备 getter、setter

最后，要 hook 一个对象本身（监听它自身的操作、函数调用等），需要使用 `Proxy、Reflect` API。

# 读写属性

讨论 `obj.x` 或 `obj.x = 1` 这样的读写情况。

## Hook 属性的值

针对 `obj.x` 属性的值的读写。

### 没有 getter 与 setter

此时形如下面这样：

```js
Object.getOwnPropertyDescriptor(obj, 'x')
// {value: 1, writable: true, enumerable: true, configurable: true}
```



方案一：默认情况下的 hook 可以改变它的值，但不能监听属性的读写。

```js
Object.defineProperty(obj, 'x', { 
    value: 2233，
    /* 其它属性描述符应该保持不变 */ 
});
// 读写 obj.x 时不会输出何时访问了该属性、又设置了哪些值
```



方案二：要想监听其读写并输出日志，只能手动添加 getter、setter，但改变了属性描述符。

```js
let temp = obj.x; // 记录读写 obj.x 时的值
Object.defineProperty(obj, 'x', {
    get()  { console.log("read obj.x");     return temp; },
    set(v) { console.log("set obj.x:", v);  temp = v;    },
    /* 其它属性描述符应该保持不变，但丢失了 writable、value 属性 */
});
```



**最终选择：采用方案二，因为它的能力更强大！**



### 具备 getter 与 setter

此时形如下面这样：

```js
Object.getOwnPropertyDescriptor(obj, 'x')
// {enumerable: false, configurable: false, get: ƒunction, set: ƒunction}
```



要想监听该属性，其实就是 hook getter、setter 两个函数，重点在于函数的 `this` 值咯，具体见[Hook 函数](#调用函数)。

```js
// 伪代码
const desc = Object.getOwnPropertyDescriptor(obj, 'x');
// hook getter、setter 然后替换原来的咯
const new_getter = hook_func(desc?.get);
const new_setter = hook_func(desc?.set);

Object.defineProperty(obj, 'x', {
    get: new_getter,
    set: new_setter,
    /* 其它属性描述符应该保持不变 */ 
});
```



## Hook 属性自身

针对 `obj.x` 属性自身的读写，比如监听 `obj.x.a` 或 `a in obj.x` 等操作。

很显然，这必须使用到 `Proxy` API，如下：

```js
// 监听 obj.x 属性自身的读取
const new_obj_x = new Proxy(obj.x, {
    get() {}, // 能监听到 obj.x.a 这样所有属性的读取
    set(v) {}, // 能监听到 obj.x.a = 1 这样所有属性的写入
    /* 其它 proxy handler 能监听到属性自身的其它操作，根据情况进行完善 */
});

// 现在 obj.x 有了全新的值，所以需要【hook 该属性的值】
// 当然，如果还想监听该属性值的变化，则需要处理 getter、setter 了
Object.defineProperty(obj, 'x', { value: new_obj_x });
```





## 具体的 Hook

也就是说，对于 `obj.x` 这个属性值的读写，具体有以下的 hook 需求：

-   对于 `obj.x` 读取操作，能**拦截读取到的值**。比如无论任何情况，读取 `obj.x` 的值固定为 `2233` 等
-   对于 `obj.x = 2` 写入操作，能**输出写入了什么值、拦截写入的值**。比如无论任何情况，设置的值都在原本的基础上乘以 2233 等

同时，还要存在**条件断点**，在读取到特定的值、写入特定的值时能触发断点。

# 调用函数

讨论 `obj.func(1, 2)` 这样的函数情况，注意！`obj.func` 本身也是一个属性，重点在于它可以被调用，也是此处主要讨论的地方。

本质上也是利用 `Proxy API` 啦。

```js
// 监听 obj.func 属性自身
const new_obj_func = new Proxy(obj.func, {
    apply() {}     // 重写函数调用
    construct() {} // 重写构造函数
    /* 其它 proxy handler 能监听到属性自身的其它操作，根据情况进行完善 */
});

// 现在 obj.func 有了全新的值，所以需要【hook 该属性的值】
// 当然，如果还想监听该属性值的变化，则需要处理 getter、setter 了
Object.defineProperty(obj, 'func', { value: new_obj_func });
```



## 具体的 Hook

也就是说，对于 `obj.func` 这个函数调用，具体有以下的 hook 需求：

-   能输出传入的参数、能拦截传入的参数
-   能输出函数的返回值、能拦截返回的值
-   能修改函数的调用逻辑

同时，还要存在**条件断点**，在读取到特定的参数、返回值时能触发断点。

# 总结

通过上面的阐述，可以这样设计：

-   `class BasicHooker` 包含了通用的 hook 操作
-   `class BasicPropertyHooker extends BasicHooker` 包含了通用的 hook 属性的操作
-   `class PropertyHooker extends BasicPropertyHooker` hook 没有 getter、setter 的属性
-   `class PropertyGetterSetterHooker extends BasicPropertyHooker` hook 具备 getter、setter 的属性
-   `class MethodHooker extends BasicPropertyHooker` hook 函数

在 API 设计上，因为存在很深的继承关系，所以父类严格控制字段访问权限，避免子类误操作。

对于一些暴露到外部的、用于读写内部属性的 API（浏览器控制台可使用），保留 `get_、set_` 这样的前缀，将它们实现为函数而不是 `getter、setter` 等方法，这样方便在浏览器控制台中检索与查看。

同时，将暴露的 API 都返回 `this`，方便链式调用。

# 对抗检测

根据上面的 hook 方案，检测的点在于：

-   修改的属性描述符
-   Proxy 对象自身

对于属性描述符的检测可以简单解决，难点在于 Proxy 对象，**经过实践，在 JS 层面不可能伪造**，最终方案是在 JS 引擎创建一个自定义的 `CureProxy` 对象，它具备所有 Proxy 的功能，同时增加一些需要的功能、解决一些检测。

不过现在 AI Agent 已经非常强大，谁还傻傻分析网页，我已经放弃了修改底层引擎的想法，本项目仅仅是保留研究的成果。