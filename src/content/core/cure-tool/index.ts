import * as constant from "./constant";
import * as proxy_handler from "./proxy-handler";
import * as normal from "./normal";
import * as stack_handler from "./stack-handler";
import * as stringifier from "./stringifier";
import * as property_handler from "./property-handler";
import * as msg_handler from "./msg-handler";
import * as setting_binder from "./setting-binder";
import cure_share from "../cure-share";

export default cure_share.ElseFunc.create_clean_object(
  {
    proxy_handler,
    stack_handler,
    property_handler,
    msg_handler,
    setting_binder,
    constant,
    normal,
    stringifier,
  },
  true,
  "CureTool",
);
