/* eslint-disable @typescript-eslint/no-explicit-any */

/** 用于存储相关信息时应该有的接口 */
interface ICureStorage {
  set(key: any, value: any): void;
  get(key: any): any;
  clear(): void;
  /** 输出内部存储的信息 */
  show?(): void;
}

/** 记录生成 Blob 对象的数据、以及生成的堆栈信息 */
type BlobToObject = {
  /** 记录调用 Blob 构造函数时的参数信息 */
  params: {
    /**
     * 如果是字符串，说明该参数太多了，视作无效。
     * 否则，保存原始参数信息，方便后续往前面插入新的数据！
     *
     * 当前，只专注于内部是 string 的 blob 参数，如果是二进制暂时忽略了
     */
    blobParts: BlobPart[] | string;
    options?: BlobPropertyBag;
  };
  /** 记录创建 Blob 实例的堆栈信息 */
  stack: string;
};

/** 创建 blob url 时，还可以是非 Blob 对象，但也要输出对应的堆栈信息！ */
type BlobUrlToObject = {
  /** 仅记录描述信息，因为这是非 Blob 对象创建的 blob url，不太好输出啦。
   * 所以就让它为 "unknown object" 哟。
   */
  params: "[CureMiracle unkown object]";
  /** 记录创建 blob url 的堆栈信息 */
  stack: string;
};
