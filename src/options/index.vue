<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <section class="header">
    <el-menu
      default-active="/net-request"
      mode="horizontal"
      router
      style="--el-menu-active-color: var(--cure-idol)"
    >
      <el-menu-item index="/net-request">请求与响应</el-menu-item>
      <el-menu-item index="/proxy-handler">代理配置</el-menu-item>
    </el-menu>
  </section>
  <section class="body">
    <RouterView></RouterView>
  </section>
</template>

<style scoped>
.body {
  padding: 20px 40px;
}
</style>
