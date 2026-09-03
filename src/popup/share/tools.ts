/** 定义一些通用的函数，通常是封装现有的 API */
import { ElNotification } from "element-plus";

/** 封装 ElNotification，默认从右下角弹窗 */
export function cure_notifacation(
  message: string,
  type: "success" | "warning" | "info" | "error",
  obj?: {
    onClose?: () => void;
    title?: string;
    duration?: number;
  },
) {
  const el = ElNotification({
    title: obj?.title,
    message,
    type,
    onClose: obj?.onClose,
    duration: obj?.duration || 3000,
    position: "bottom-right",
    customClass: "cure_notification",
    // 手动点击它时才关闭
    showClose: false,

    onClick() {
      el.close();
    },
  });
}
