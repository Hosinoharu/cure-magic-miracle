import Proxy from "../views/proxy-handler.vue";
import ResReq from "../views/res-req.vue";

import { createRouter, createWebHashHistory } from "vue-router";

const ruoter = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/reqres",
    },
    {
      path: "/reqres",
      name: "reqres",
      component: ResReq,
    },
    {
      path: "/proxy",
      name: "proxy",
      component: Proxy,
    },
  ],
});

export default ruoter;
