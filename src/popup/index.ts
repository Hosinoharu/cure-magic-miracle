import "@/shared/test_ui";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./index.vue";

import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/global.css";
import "./index.css";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
