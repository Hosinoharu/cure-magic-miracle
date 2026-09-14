<!-- 性能优化
 当组件没有被聚焦时，显示一个普通的文本或其它内容，
 当点击时，才显示原本的组件
-->

<template>
  <section ref="container">
    <section v-if="is_show_fake_elem" class="fake-elem">
      <slot name="fake"></slot>
    </section>

    <section v-else class="real-elem">
      <slot name="real"></slot>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const container = ref<HTMLElement | null>(null);
const is_show_fake_elem = ref(true);

let waitId = 0;

function hide_real_elem() {
  waitId = setTimeout(() => {
    if (container.value?.contains(document.activeElement)) {
      return hide_real_elem();
    }

    is_show_fake_elem.value = true;
  }, 1000);
}

onMounted(() => {
  container.value?.addEventListener("click", () => {
    clearTimeout(waitId);
    is_show_fake_elem.value = false;
  });

  container.value?.addEventListener("mouseenter", () => {
    clearTimeout(waitId);
  });

  container.value?.addEventListener("mouseleave", () => {
    hide_real_elem();
  });
});
</script>

<style scoped>
.fake-elem,
.real-elem {
  display: flex;
}
</style>
