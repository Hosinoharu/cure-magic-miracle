import "@/shared/test_ui";

import { createApp } from "vue";
import App from "./index.vue";

import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/global.css";

const app = createApp(App);
app.mount("#app");
