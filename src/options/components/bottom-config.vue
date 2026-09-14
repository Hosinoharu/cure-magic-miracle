<!-- 固定在底部的控制面板 -->

<template>
  <section class="config-panel">
    <section class="config-panel-row">
      <section class="config-panel-item">
        <section class="config-panel-key">
          <el-text type="primary">
            <slot name="one-row-one-key"></slot>
          </el-text>
        </section>
        <section class="config-panel-value">
          <el-text>
            <slot name="one-row-one-value"></slot>
          </el-text>
        </section>
      </section>

      <el-divider direction="vertical"></el-divider>

      <section class="config-panel-item">
        <section class="config-panel-key">
          <el-text type="primary">
            <slot name="one-row-two-key"></slot>
          </el-text>
        </section>
        <section class="config-panel-value">
          <slot name="one-row-two-value"></slot>
        </section>
      </section>

      <el-divider direction="vertical"></el-divider>

      <section class="end-btn">
        <slot name="one-row-end-btn"></slot>
      </section>
    </section>

    <el-divider></el-divider>

    <section class="config-panel-row">
      <section class="config-panel-item">
        <section class="config-panel-key">
          <el-text type="primary">
            <slot name="two-row-one-key"></slot>
          </el-text>
        </section>
        <section class="config-panel-value">
          <slot name="two-row-one-value"></slot>
        </section>
      </section>

      <el-divider direction="vertical"></el-divider>

      <section class="config-panel-item">
        <section class="config-panel-key">
          <el-text type="primary">
            <slot name="two-row-two-key"></slot>
          </el-text>
        </section>
        <section class="config-panel-value">
          <el-text>
            <slot name="two-row-two-value"></slot>
          </el-text>
        </section>
      </section>

      <el-divider direction="vertical"></el-divider>

      <section class="end-btn">
        <slot name="two-row-end-btn"></slot>
      </section>
    </section>
  </section>
</template>

<style scoped>
.config-panel {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100vw;
  height: 5.5rem;
  padding: 1rem;
  border-top: 1px solid var(--cure-idol);

  > section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 0 1rem;
  }

  > .el-divider {
    margin: 0.5em 0;
  }
}

.config-panel-row {
  --key-width: 8rem;

  .config-panel-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    width: 40%;

    .config-panel-key {
      min-width: fit-content;
      width: var(--key-width);
    }

    .config-panel-value {
      flex: 1;
      text-align: right;
    }
  }

  > .config-panel-item:nth-of-type(1) {
    flex: 1;
  }

  > .config-panel-item:nth-of-type(2) {
    width: calc(var(--key-width) + 5rem);
  }

  .end-btn {
    display: flex;
    flex-direction: column;
    min-width: fit-content;
    width: 150px;
  }
}

.rpc-status {
  display: flex;
  justify-content: flex-end;
  align-items: center;

  .rpc-status-circle {
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    margin-top: 1px;
    margin-left: 10px;
    background-color: grey;
  }
}
</style>
