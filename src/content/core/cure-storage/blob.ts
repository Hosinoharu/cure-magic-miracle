/** 封装一个简单的 Map，存储 blob url 和生成它的位置 */

import cure_console from "../cure-console";
import { BaseStorage } from "./base";

/** 封装一个简单的 Map，存储生成 blob_url 的来源，以及堆栈等信息  */
export class BlobStorage extends BaseStorage<
  string,
  BlobToObject | BlobUrlToObject
> {
  protected override logo = "Blob Storage";

  /** 找到 blob_url 对应的堆栈信息等 */
  get(blob_url: string) {
    const info = this.storage.get(blob_url);
    if (info !== undefined) {
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: ["Found Blob info, Params:", info.params, `\n${info.stack}`],
      });
    } else {
      cure_console.logger.log_with_logo({
        logo: this.logo,
        data: ["Not found"],
      });
    }
  }
}
