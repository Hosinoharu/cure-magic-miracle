import * as logger from "./logger";
import * as normal from "./normal";
import cure_share from "../cure-share";

export default cure_share.ElseFunc.create_clean_object(
  { logger, normal },
  true,
  "CureConsole",
);
