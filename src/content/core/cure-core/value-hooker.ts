import cure_console from "../cure-console";
import cure_share from "../cure-share";
import cure_tool from "../cure-tool";

/** 对一个值进行 hook。
 *
 * PropertyValueHooker 只能监测一个属性的读写，比如 obj = {x: 'hello'};
 * 如果对 obj.x 应用了 PropertyValueHooker，那么当调用 func(obj.x) 时自然能
 * 触发 hook，但是仅此而已，无法继续追踪！所以 PropertyValueHooker 更多是用于“监控”值的设置。
 *
 * 所以才有了 ValueHooker，对一个值进行 hook！即将一个值替换成 Proxy 进行跟踪。
 */
export function create_value_hooker(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  des: string,
  debug?: boolean,
) {
  des = des || "track";
  debug = debug || false;

  if (typeof value === "string") {
    // return new cure_tool.cureString(value, des, debug);
  }

  const temp = cure_share.ElseFunc.create_clean_object({ value });
  return cure_tool.proxy_handler.create_proxy(temp, {
    get: function curemiracle_get(
      target: typeof temp,
      property: PropertyKey,
      _receiver: object,
    ) {
      cure_console.logger.log_with_logo({
        logo: "Value Hooker",
        data: [
          `${des} -> Get Property: ${cure_share.ElseFunc.to_normal_string(property)}`,
        ],
      });
      // 既然跟踪值，那么 symbol 属性通常不需要关注
      if (typeof property !== "symbol") {
        cure_tool.stack_handler.curemiracle_get_caller_location(true, "", des);
      }

      if (debug) {
        cure_tool.normal.curedebug();
        debugger;
      }
      const raw = target.value[property];
      if (typeof raw === "function") {
        // 到取值的地方就暂停！！！
        if (property === "toString" || property === "valueOf") {
          cure_tool.normal.curedebug();
          debugger;
        }
        // 如果访问底层字符串方法还需要绑定 this 哟
        return target.value[property].bind(target.value);
      }
      // 此时就是访问字符串的普通属性啦
      return raw;
    },
  });
}
