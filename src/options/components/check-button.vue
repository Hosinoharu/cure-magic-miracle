<!-- 实现一个用于 checkbox 的 button -->

<template>
  <button
    type="button"
    class="checkbox-button"
    :class="modelValue ? 'is-checked' : 'is-unchecked'"
    @click="$emit('click')"
  ></button>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
}>();

defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.checkbox-button {
  width: min(1em, 80%);
  aspect-ratio: 1;

  border-radius: 30%;
  border: none;

  cursor: pointer;
  transition: background-color 0.3s;
}

.is-checked {
  background-color: var(--cure-kiss);
}

.is-unchecked {
  background-color: #444;
}
</style>
