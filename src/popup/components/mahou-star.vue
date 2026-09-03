<!-- 
封装 ElementPlus 的一个 icon -- Star，让它有一个动画咯。
中间有一个大星星在旋转，周围有 3 个小行星绕着它一闪一闪缓慢旋转。

另外，还可以只展示中间的大星星，并以特定的 PrettyCure 颜色
-->

<template>
  <!-- 这里还包裹一层，因为外部可能改变本组件大小，容易引起内部小星星的位置变化 -->
  <main v-bind="$attrs">
    <section :style="{ border: 0 ? '1px solid blue' : 'none' }">
      <!-- 中间的大星星。单独点亮的时候转得快一点啦 -->
      <section
        class="center-star"
        :style="{
          border: 0 ? '1px solid yellow' : 'none',
          '--star-color': get_star_color(light, dark),
          '--speed': light ? 2 : 12,
        }"
      >
        <el-icon :class="{ 'center-star-active': rotate || light }">
          <Star />
        </el-icon>
      </section>
      <!-- 3 个小星星 -->
      <section
        class="star-container-wrapper"
        v-if="rotate"
        :style="{ border: 0 ? '2px solid skyblue' : 'none' }"
      >
        <!-- 小星星外部的容器，它用来模拟公转。共有 3 个小星星，它们会自转。
            当 rotate 为 true 时，它们就会开始旋转哟，否则都不会显示小星星
            另外，还会初始化小星星的位置，让彼此错开 —— 使用 css 变量啦
        -->
        <div
          class="star-container"
          v-for="(star, index) in stars_info"
          :style="{
            '--speed': star.speed,
            '--delay': star.delay,
            color: star.color,
            border: 0 ? '1px solid green' : 'none',
          }"
          :class="{ 'star-container-active': rotate }"
          :key="index"
        >
          <el-icon class="lite-star" :class="{ 'lite-star-active': rotate }">
            <StarFilled />
          </el-icon>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Star, StarFilled } from "@element-plus/icons-vue";

/** 控制该 Star 是否旋转 */
defineProps<{
  rotate?: boolean;
  /** 以该颜色点亮大星星，并缓慢旋转 */
  light?: "idol" | "wink" | "kyun";
  /** 让当前的大星星变暗。只要传入了这个，则一定会变暗哟！ */
  dark?: boolean;
}>();

/** 随机生成 [3, max] 数字 */
function get_random_spped(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function get_star_color(light?: "idol" | "wink" | "kyun", dark?: boolean) {
  if (dark) return "var(--default-dark-star-color)";
  if (!light) return "var(--default-light-star-color)";
  return `var(--cure-${light})`;
}

const base_speed = get_random_spped(3, 6);
const step = 2;

/** 3 个小星星的颜色、旋转速度、延迟 */
const stars_info = [
  {
    color: get_star_color("idol"),
    speed: base_speed,
    delay: 0,
  },
  {
    color: get_star_color("wink"),
    speed: base_speed + step,
    delay: 0.3,
  },
  {
    color: get_star_color("kyun"),
    speed: base_speed + step * 2,
    delay: 0.5,
  },
];
</script>

<style scoped>
main {
  display: flex;
  justify-content: center;
  align-items: center;

  --default-center-star-size: 1.5em;
  --default-lite-star-size: 0.5em;
}

/* 最外层的容器 */
main section {
  height: fit-content;
  width: fit-content;
  position: relative;
}

/* #region 大星星 缓慢旋转 */

/* 让其内部的大星星居中 */
.center-star {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: var(--default-center-star-size);
  color: var(--star-color);
}

/* 外层星星要转得慢一点，但不会变化大小 */
.center-star-active {
  filter: drop-shadow(0 0 3px);
  animation: center_star_rotate calc(var(--speed) * 1s) linear infinite;
}

@keyframes center_star_rotate {
  from {
    transform: rotate();
  }

  to {
    transform: rotate(360deg);
  }
}

/* #endregion 大星星 */

/* #region 小星星容器 实现公转 */

/** 让其自身居中！ */
.star-container-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
}

/* 让小星星的容器长度比大星星大一点，然后该容器绕着大星星旋转咯 */
.star-container {
  position: relative;
  top: -50%;
  height: 200%;
  float: left;
}

.star-container-active {
  animation: orbit_rotate calc(var(--speed) * 1s) linear infinite;
}

@keyframes orbit_rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* #endregion 小星星容器 */

/* #region 小星星 实现自转 */

/* 星星的通用样式 */
.lite-star {
  position: absolute;
  font-size: var(--default-lite-star-size);
}

/* #tag 小星星点亮后的状态 */
.lite-star-active {
  filter: drop-shadow(0 0 3px);
  animation: lite_star_rotate 2s linear infinite;
  animation-delay: calc(var(--delay) * 1s);
}

/* 星星旋转的动画 */
@keyframes lite_star_rotate {
  0% {
    transform: rotate(0deg) scale(1);
  }

  25% {
    transform: rotate(90deg) scale(1.2);
  }

  50% {
    transform: rotate(180deg) scale(1);
  }

  75% {
    transform: rotate(270deg) scale(0.6);
  }

  100% {
    transform: rotate(360deg) scale(1);
  }
}

/* #endregion 小星星 */
</style>
