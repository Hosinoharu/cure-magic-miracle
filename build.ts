/** 构建项目 */

import { build } from "vite";
import { get_core_config, get_content_config, Logger } from "./config";

const logger = new Logger("build");

build_all();

async function build_all() {
  logger.info("build background .etc");
  await build(get_core_config());
  logger.divide_line();

  logger.info("build content scripts main");
  await build(get_content_config("main"));
  logger.divide_line();

  logger.info("build content scripts isolated");
  await build(get_content_config("isolated"));
  logger.divide_line();
}
