/** 实现隔离的 Promise API */

import { save_raw_method } from "./helper";

const raw_then = save_raw_method(Promise.prototype.then);
const raw_catch = save_raw_method(Promise.prototype.catch);

/** 当插件中使用 Promise.then 时，会用到自带的 then API，现在需要隔离它，
 * 但为了保持链式调用，所以可以这样做：
 *
 * `new CurePromise(p).then()` 这样来调用咯
 */
export class CurePromise<T> {
  constructor(private _p: Promise<T>) {}

  then(
    resolve: NormalFunction | undefined = undefined,
    reject: NormalFunction | undefined = undefined,
  ) {
    return raw_then(this._p, resolve, reject);
  }

  catch(reject: NormalFunction | undefined = undefined) {
    return raw_catch(this._p, reject);
  }

  get [Symbol.toStringTag]() {
    return "CurePromise";
  }
}
