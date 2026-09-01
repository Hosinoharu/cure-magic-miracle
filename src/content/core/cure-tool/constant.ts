/** 关于一些值必须使用固定值的原因。
 *
 * 此前，我的想法是将 `PROXY_RAW_OBJ_SYMBOL` 等值定义为 `Symbol`，但网站可能会进行
 * 跨越 `iframe` 的检测，此时，不同 “域” 的 `PROXY_RAW_OBJ_SYMBOL` 是不同的，导致底层
 * 的一些访问操作无效 —— 因为它们的 `PROXY_RAW_OBJ_SYMBOL` 不同！！
 *
 * 所以，最终决定还是将它们固定为一个值 —— **不能随机取值，必须保证不同 `iframe` 中它们的值
 * 是相同的哟**。也不能简单地利用 `globalThis.top.curemiracle.xxx` 来获取，可能涉及到 `iframe` 的跨域问题。
 *
 * 这是一个大坑！花费了很多时间。以后应当谨记：跨 `iframe` 的时候，一定要保证值是相同的！
 *
 * 更新，使用 `Symbol.for` 来创建就可以了！
 */

/** 注入的代码有好几个部分，是分批次注入的，具体如下：
 * 1. 先注入核心的 `hook` 代码，它默认开启了所有 hook
 * 2. 读取 storage（这需要花费事件，导致小小延迟）获取配置项，再注入到网页中
 * 3. 提前注入的 hook 代码根据注入的配置项进行初始化
 *
 * 为了尽可能快的注入，上述的【1、2】步骤是异步且都没有 `await` 等待，所以可能
 * 导致【1】步骤中注入的 hook 代码没有执行完成，反而先将【2】步骤中的配置项注入了。
 *
 * 所以，【2】步骤中，如果注入时发现【1】步骤没有执行完成，那就暂时将配置项存储到 `globalThis` 中，
 * 保存的名称就是本变量的名字。
 *
 * 这样，当【1】步骤中的 hook 代码执行完成时，检查是否存在该属性，如果存在就直接使用该属性进行初始化了，
 * 初始化完成后，需要及时删除该属性哟。
 *
 * **因为插件需要将配置项注入到网页中，用这个名称来存储，所以不能使用 `symbol`**
 */
export const temp_setting_symbol = "curemiracle_temp_setting_symbol";

/** 一个特殊的属性，用于标记某个对象是否为 `Proxy`，具体操作是这样的：
 * 1. 如果 obj 是 Proxy 对象，则当 obj 获取该属性时，返回底层对象
 * 2. 如果 obj 不是 Proxy 对象，访问该属性则返回 undefined
 * 3. 为了确保多个同源的 iframe 域中可以访问，此处必须使用固定的值，不能使用 `Symbol` 哟
 */
export const proxy_raw_obj_symbol = Symbol.for(
  "curemiracle_proxy_raw_obj_symbol",
);

/** 一个特殊属性，用于返回 Proxy 对象的原始属性描述符。
 * 比如 `hook atob` 后，现在的 `atob` 就是一个 `Proxy` 对象啦。
 * 将来通过 `Object.getOwnPropertyDescriptor(globalThis, 'atob')` 获取其属性描述符时，
 * 可以访问 `atob[raw_descriptor_symbol]` 获取它底层的属性描述符并进行伪造咯
 */
export const proxy_raw_descriptor_symbol = Symbol.for(
  "curemiracle_proxy_raw_descriptor_symbol",
);

/** 一个特殊的属性，用于获取插件创建的 Proxy 的内部描述信息。
 *
 * 增加它的原因：在利用 `Object.defineProperty(obj, 'x', {...})` 重写对象 obj 的 x 属性时，
 *
 * 如果该属性被 hook 过（是一个 Proxy 对象），是需要输出相关描述信息的。即说明哪个东西被改变了。
 *
 * 这时候就需要访问 `obj.x[proxy_des_symbol]` 来获取描述信息了。`obj.x` 是一个 Proxy，
 * 所以可以在内部的 `handler get` 中返回当初创建该 Proxy 时的描述信息哟。
 */
export const proxy_description_symbol = Symbol.for(
  "curemiracle_proxy_description_symbol",
);

/** 一个特殊属性，用于获取 Proxy(prototype) 背后真正的原型。
 * 因为现在使用了 Proxy(prototype) 的机制拦截不可变对象的新增属性，举例说明一下。
 *
 * - 比如 `Object.getPrototypeOf(obj)` 时得到的会是一个 `Proxy`，它拦截了 obj 的新增属性
 * - 所以，当实际获取 obj 的原型时，返回返回该 Proxy 背后真正的原型！这就需要本特殊属性了！
 */
export const proxy_raw_prototype_symbol = Symbol.for(
  "curemiracle_proxy_raw_prototype_symbol",
);

/** 手动定义最大自循环递归深度，超过它时会手动抛出 RangeError('Maximum call stack size exceeded')。
 * 同时清空所有的 `Interval` 哟
 *
 * 函数调用次数超过 MAXIMUM_CALL_STACK_SIZE 时会检查一次堆栈。
 * 此时获取的堆栈大小就是这个值咯，如果实际堆栈层数小于它，说明不存在递归循环，
 * 否则，不判断是否真的存在循环，堆栈这么深，直接认定为循环调用了！！！
 */
export const maximum_call_stack_size = 1000;
