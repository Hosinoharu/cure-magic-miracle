/** 整理成单一的对象方便使用 */

import cure_console from "../cure-console";
import cure_share from "../cure-share";
import cure_tool from "../cure-tool";
import { cure_setting, hooker_toggler, hooker_setting } from "../cure-settings";
import {
  cure_storage,
  create_propertyvalue_hooker,
  create_property_hooker,
  create_method_hooker,
  create_object_hooker,
  create_value_hooker,
  cure_hooked,
} from "../cure-core";
import { extension_name } from "@/shared";

export default cure_share.ElseFunc.create_clean_object(
  {
    console: cure_console,
    tool: cure_tool,
    share: cure_share,
    storage: cure_storage,
    cure_setting,
    hooker_setting: hooker_toggler,
    hooked: cure_hooked,
    raw_hooker_setting: hooker_setting,
    create_propertyvalue_hooker,
    create_property_hooker,
    create_method_hooker,
    create_object_hooker,
    create_value_hooker,
  },
  false,
  extension_name,
);
