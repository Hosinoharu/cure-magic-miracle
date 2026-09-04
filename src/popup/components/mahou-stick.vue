<!-- 3 根好看的魔法棒 -->

<template>
  <main v-bind="$attrs">
    <section class="magic-stick-container">
      <el-icon
        class="magic-stick left-stick"
        :class="{ active: light_left }"
        :style="{
          color: light_left
            ? 'var(--cure-wink)'
            : 'var(--default-dark-star-color)',
        }"
      >
        <MagicStick />
      </el-icon>
      <el-icon
        class="magic-stick center-stick"
        :class="{ active: light_center }"
        :style="{
          color: light_center
            ? 'var(--cure-idol)'
            : 'var(--default-dark-star-color)',
        }"
      >
        <MagicStick />
      </el-icon>
      <el-icon
        class="magic-stick right-stick"
        :class="{ active: light_right }"
        :style="{
          color: light_right
            ? 'var(--cure-kyun)'
            : 'var(--default-dark-star-color)',
        }"
      >
        <MagicStick />
      </el-icon>
    </section>
  </main>
</template>

<script setup lang="ts">
import { MagicStick } from "@element-plus/icons-vue";

defineProps<{
  /** 点亮左边的 */
  light_left: boolean;
  /** 点亮右边的 */
  light_right: boolean;
  /** 点亮中间的 */
  light_center: boolean;
}>();
</script>

<style scoped>
main {
  display: flex;
  justify-content: center;

  --star-margin: -10%;
  --star-altitude: -10%;
}

.magic-stick-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.left-stick {
  margin-right: var(--star-margin);
  rotate: -90deg;
  margin-bottom: var(--star-altitude);
}

.center-stick {
  top: var(--star-altitude);
  rotate: -45deg;
}

.right-stick {
  margin-left: var(--star-margin);
  margin-bottom: var(--star-altitude);
}

/* #cure-tip 点亮魔法棒 */
.active {
  animation: shine 0.5s infinite alternate;
}

@keyframes shine {
  from {
    filter: drop-shadow(0 0 0 transparent);
  }

  to {
    filter: drop-shadow(1px 1px 2px currentColor)
      drop-shadow(-1px -1px 2px currentColor);
  }
}
</style>
