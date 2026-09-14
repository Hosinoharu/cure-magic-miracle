import ProxyHandler from "../views/proxy-handler.vue";
import NetRequest from "../views/net-request.vue";

import { createRouter, createWebHashHistory } from "vue-router";

const ruoter = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/net-request",
    },
    {
      path: "/net-request",
      name: "net-request",
      component: NetRequest,
    },
    {
      path: "/proxy-handler",
      name: "proxy-handler",
      component: ProxyHandler,
    },
  ],
});

export default ruoter;
