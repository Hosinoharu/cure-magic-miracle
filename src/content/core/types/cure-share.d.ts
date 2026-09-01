/** 定义一个泛型类型，用于将对象方法转换为函数调用，其实就是添加一个 this 参数 */
type MethodToFunc<T extends NormalFunction, ThisType = ThisParameterType<T>> = (
  _this: ThisType,
  ...args: Parameters<T>
) => ReturnType<T>;

type SavedRawMethod<T extends { [key: string]: NormalFunction }> = {
  [K in keyof T]: T[K] extends NormalFunction ? MethodToFunc<T[K]> : never;
} & CallableFunction;

/** 把对象上的所有方法都转为函数调用。注意这里的 T 应该是 `String.prototype` 这样的原型 */
type ObjectMethodToFunc<T> = {
  [K in keyof T]: T[K] extends NormalFunction
    ? SavedRawMethod<Record<K, T[K]>>
    : T[K];
};

type ArrayMethodToFunc = {
  [K in keyof Array<unknown>]: Array<unknown>[K] extends NormalFunction
    ? <T extends Array<unknown>>(
        _this: T,
        // 让推导的参数、返回值根据 T 来确定
        ...args: T[K] extends (...args: infer A) => unknown ? A : never
      ) => T[K] extends (...args: unknown[]) => infer B ? B : never
    : Array<unknown>[K];
};

type HookScope = "Window" | "Worker" | "SharedWorker" | "ServiceWorker";
