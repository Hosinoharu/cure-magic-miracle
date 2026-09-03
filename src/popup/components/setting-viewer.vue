<!-- 将配置项的展示、收集整理成组件以便复用 -->

<template>
  <div class="settings">
    <div
      class="one-setting"
      v-for="setting in input_settings"
      :key="setting.name"
    >
      <!--因为可能存在额外信息 info，所以使用 tooltip 组件包裹一层来展示。
            因为整个网页已经使用了 ElPlus 的 dark 模式，结果这里的 el-tooltip 只能使用 light
            才能达到 dark 模式的效果 —— 干！ -->
      <el-tooltip
        effect="light"
        :content="setting.info || ''"
        :hide-after="0"
        :enterable="false"
        :disabled="!setting.info"
        placement="top-start"
      >
        <!--  开关型 -->
        <el-checkbox
          v-if="setting.type === 'switch'"
          v-model="vmodel_setting[setting.name]"
          :label="setting.des"
          border
        />

        <!-- 输入数字型 -->
        <el-input
          v-else-if="setting.type === 'input-int'"
          type="number"
          placeholder="o(*￣▽￣*)ブ"
          @input="(v: string) => number_input(setting.name as string, v)"
          v-model="vmodel_setting[setting.name]"
          clearable
          border
        >
          <template #prepend>{{ setting.des }}</template>
        </el-input>

        <!-- 字符串型 -->
        <el-input
          v-else
          type="text"
          placeholder="(～￣▽￣)～"
          @input="(v: string) => text_input(setting.name as string, v)"
          v-model="vmodel_setting[setting.name]"
          clearable
          border
        >
          <template #prepend>{{ setting.des }}</template>
        </el-input>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCureSettingStore, useExtensionSettingStore } from "../store";
import { onMounted } from "vue";

const cure_setting_store = useCureSettingStore();
const extension_setting_store = useExtensionSettingStore();

onMounted(async () => {
  await cure_setting_store.init();
  await extension_setting_store.init();
});

/** 接收传递过来的配置项、以及要收集到的配置项 */
const props = defineProps(["setting", "target"]);
/** 这是要展示哪些配置项，将它们渲染出来 —— 即这是用于输出的 */
const input_settings: OneSetting<CureSetting | ExtensionSetting>[] =
  props.setting;

/** 这表明当前传入的配置是哪个种类的 —— 是 cure_setting 配置项，还是插件自身的配置项 */
const target: "Hook" | "Extension" = props.target;
/** 这是绑定到上面的配置项，当配置项变动时，就记录下来，触发响应式 */
const vmodel_setting =
  target === "Hook"
    ? cure_setting_store.curr_cure_setting
    : extension_setting_store.curr_extension_setting;
/** 对于输入数字类型的 input 的 input 事件，转换存储的格式 */
function number_input(setting_name: string, value: string | number) {
  // @ts-ignore
  vmodel_setting[setting_name] = Number(value);
}

function text_input(setting_name: string, value: string) {
  // @ts-ignore
  vmodel_setting[setting_name] = value.trim();
}
</script>

<style scoped>
.el-checkbox {
  width: 100%;
}

/** 一个单独配置项的样式 */
.one-setting {
  margin-bottom: 10px;
  width: 100%;
}

.one-setting:hover .el-checkbox {
  color: var(--default-light-font-color);
}
</style>
